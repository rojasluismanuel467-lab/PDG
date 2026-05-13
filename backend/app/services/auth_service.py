from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import InvitationStatus, UserStatus
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    parse_token_payload,
    verify_password,
)
from app.exceptions.domain import (
    ConflictDomainError,
    ForbiddenDomainError,
    UnauthorizedDomainError,
    ValidationDomainError,
)
from app.models.user import User
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import (
    ActivateInvitationRequest,
    AuthLoginResponse,
    AuthRefreshResponse,
    AuthUserResponse,
    TokenPairResponse,
)


class AuthService:
    @staticmethod
    def _build_user_response(user: User) -> AuthUserResponse:
        return AuthUserResponse(
            id=user.id,
            nombre=user.nombre,
            email=user.email,
            tipo_usuario=user.tipo_usuario,
            estado=user.estado,
        )

    @classmethod
    def get_current_user_profile(cls, user: User) -> AuthUserResponse:
        return cls._build_user_response(user)

    @staticmethod
    def _issue_tokens(db: Session, user: User) -> TokenPairResponse:
        access_token, access_expires_at = create_access_token(str(user.id))
        refresh_token, refresh_expires_at, _ = create_refresh_token(str(user.id))
        AuthRepository.save_refresh_token(
            db,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=refresh_expires_at,
        )
        return TokenPairResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_expires_at=access_expires_at,
            refresh_token_expires_at=refresh_expires_at,
        )

    @classmethod
    def login(cls, db: Session, *, email: str, password: str) -> AuthLoginResponse:
        user = AuthRepository.get_user_by_email(db, email=email.lower())
        if user is None or user.password_hash is None:
            raise UnauthorizedDomainError("Invalid credentials")

        if user.estado != UserStatus.ACTIVO:
            raise ForbiddenDomainError("User is not active")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedDomainError("Invalid credentials")

        tokens = cls._issue_tokens(db, user)
        AuthRepository.add_audit_log(
            db,
            user_id=user.id,
            perfil_usuario=user.tipo_usuario,
            project_id=None,
            tipo_accion="LOGIN_EXITOSO",
            descripcion="User login successful",
        )
        db.commit()

        return AuthLoginResponse(user=cls._build_user_response(user), tokens=tokens)

    @classmethod
    def refresh(cls, db: Session, *, refresh_token: str) -> AuthRefreshResponse:
        payload = parse_token_payload(refresh_token)
        if payload.token_type != "refresh":
            raise UnauthorizedDomainError("Invalid refresh token")

        token_hash = hash_token(refresh_token)
        stored = AuthRepository.get_refresh_token(db, token_hash=token_hash)
        if stored is None:
            raise UnauthorizedDomainError("Refresh token not found")

        if stored.revoked_at is not None:
            raise UnauthorizedDomainError("Refresh token is revoked")

        now = datetime.now(UTC)
        if stored.expires_at <= now:
            AuthRepository.revoke_refresh_token(db, stored)
            db.commit()
            raise UnauthorizedDomainError("Refresh token expired")

        try:
            token_user_id = uuid.UUID(payload.sub)
        except ValueError as exc:
            raise UnauthorizedDomainError("Invalid user id in refresh token") from exc
        if token_user_id != stored.user_id:
            raise UnauthorizedDomainError("Refresh token does not belong to user")

        user = AuthRepository.get_user_by_id(db, user_id=stored.user_id)
        if user is None or user.estado != UserStatus.ACTIVO:
            raise UnauthorizedDomainError("User not available for refresh")

        AuthRepository.revoke_refresh_token(db, stored)
        tokens = cls._issue_tokens(db, user)
        AuthRepository.add_audit_log(
            db,
            user_id=user.id,
            perfil_usuario=user.tipo_usuario,
            project_id=None,
            tipo_accion="TOKEN_GENERADO",
            descripcion="Access and refresh tokens rotated",
        )
        db.commit()
        return AuthRefreshResponse(tokens=tokens)

    @classmethod
    def logout(cls, db: Session, *, current_user: User, refresh_token: str | None) -> int:
        revoked_count = 0
        if refresh_token:
            token_hash = hash_token(refresh_token)
            stored = AuthRepository.get_refresh_token(db, token_hash=token_hash)
            if stored and stored.user_id == current_user.id and stored.revoked_at is None:
                AuthRepository.revoke_refresh_token(db, stored)
                revoked_count = 1
        else:
            revoked_count = AuthRepository.revoke_all_refresh_tokens_for_user(
                db, user_id=current_user.id
            )

        AuthRepository.add_audit_log(
            db,
            user_id=current_user.id,
            perfil_usuario=current_user.tipo_usuario,
            project_id=None,
            tipo_accion="LOGOUT",
            descripcion="User logout successful",
            datos_adicionales={"revoked_tokens": revoked_count},
        )
        db.commit()
        return revoked_count

    @classmethod
    def activate_invitation(
        cls,
        db: Session,
        *,
        payload: ActivateInvitationRequest,
    ) -> AuthLoginResponse:
        invitation = AuthRepository.get_invitation_by_token(db, token=payload.token)
        if invitation is None:
            raise ValidationDomainError("Invitation token does not exist")

        if invitation.status == InvitationStatus.REVOCADA:
            raise ConflictDomainError("Invitation has been revoked")
        if invitation.status == InvitationStatus.ACEPTADA:
            raise ConflictDomainError("Invitation has already been used")
        if invitation.status == InvitationStatus.EXPIRADA:
            raise ConflictDomainError("Invitation has expired")

        now = datetime.now(UTC)
        if invitation.expires_at <= now:
            invitation.status = InvitationStatus.EXPIRADA
            db.commit()
            raise ConflictDomainError("Invitation has expired")

        user = AuthRepository.get_user_by_email(db, email=invitation.email.lower())
        if user is not None and user.tipo_usuario != invitation.invited_user_type:
            raise ConflictDomainError("User type mismatch with invitation")

        if user is None:
            generated_name = (
                payload.nombre.strip() if payload.nombre else invitation.email.split("@")[0]
            )
            user = User(
                nombre=generated_name,
                email=invitation.email.lower(),
                password_hash=hash_password(payload.password),
                tipo_usuario=invitation.invited_user_type,
                estado=UserStatus.ACTIVO,
                created_by_user_id=invitation.invited_by_user_id,
            )
            db.add(user)
            db.flush()
        else:
            if payload.nombre:
                user.nombre = payload.nombre.strip()
            user.password_hash = hash_password(payload.password)
            user.estado = UserStatus.ACTIVO

        invitation.status = InvitationStatus.ACEPTADA
        invitation.accepted_at = now
        invitation.target_user_id = user.id

        tokens = cls._issue_tokens(db, user)
        AuthRepository.add_audit_log(
            db,
            user_id=user.id,
            perfil_usuario=user.tipo_usuario,
            project_id=invitation.project_id,
            tipo_accion="INVITACION_ACEPTADA",
            descripcion="Invitation accepted and account activated",
            resource_id=invitation.id,
        )
        db.commit()

        return AuthLoginResponse(user=cls._build_user_response(user), tokens=tokens)
