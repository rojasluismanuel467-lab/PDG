from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.enums import UserType
from app.models.audit_log import AuditLog
from app.models.invitation import Invitation
from app.models.refresh_token import RefreshToken
from app.models.user import User


class AuthRepository:
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.email == email)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_invitation_by_token(db: Session, token: str) -> Invitation | None:
        stmt: Select[tuple[Invitation]] = select(Invitation).where(Invitation.token == token)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_refresh_token(db: Session, token_hash: str) -> RefreshToken | None:
        stmt: Select[tuple[RefreshToken]] = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def save_refresh_token(
        db: Session,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at.astimezone(UTC),
        )
        db.add(token)
        db.flush()
        return token

    @staticmethod
    def revoke_refresh_token(db: Session, token: RefreshToken) -> None:
        token.revoked_at = datetime.now(UTC)
        db.flush()

    @staticmethod
    def revoke_all_refresh_tokens_for_user(db: Session, *, user_id: uuid.UUID) -> int:
        stmt: Select[tuple[RefreshToken]] = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        tokens = db.execute(stmt).scalars().all()
        now = datetime.now(UTC)
        for token in tokens:
            token.revoked_at = now
        db.flush()
        return len(tokens)

    @staticmethod
    def add_audit_log(
        db: Session,
        *,
        user_id: uuid.UUID | None,
        perfil_usuario: UserType | None,
        project_id: uuid.UUID | None,
        tipo_accion: str,
        descripcion: str,
        resource_id: uuid.UUID | None = None,
        datos_adicionales: dict[str, object] | None = None,
    ) -> AuditLog:
        log = AuditLog(
            timestamp=datetime.now(UTC),
            user_id=user_id,
            perfil_usuario=perfil_usuario,
            project_id=project_id,
            tipo_accion=tipo_accion,
            descripcion=descripcion,
            resource_id=resource_id,
            datos_adicionales=datos_adicionales or {},
        )
        db.add(log)
        db.flush()
        return log
