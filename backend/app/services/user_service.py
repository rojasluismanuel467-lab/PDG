from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import UserStatus, UserType
from app.core.security import hash_password
from app.exceptions.domain import ConflictDomainError, NotFoundDomainError, ValidationDomainError
from app.models.user import User
from app.repositories.company_repository import CompanyRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserRegisterRequest
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate


class UserService:
    @staticmethod
    def _to_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            nombre=user.nombre,
            email=user.email,
            tipo_usuario=user.tipo_usuario,
            estado=user.estado,
            company_id=user.company_id,
            created_by_user_id=user.created_by_user_id,
            deactivated_at=user.deactivated_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    @classmethod
    def create_user(
        cls,
        db: Session,
        *,
        payload: UserCreate,
        created_by_user_id: uuid.UUID,
    ) -> UserResponse:
        email = payload.email.lower()
        existing = UserRepository.get_by_email(db, email=email)
        if existing is not None:
            raise ConflictDomainError("Email is already registered")

        deactivated_at = None
        if payload.estado == UserStatus.INACTIVO:
            deactivated_at = datetime.now(UTC)

        if payload.company_id is not None:
            company = CompanyRepository.get_by_id(db, company_id=payload.company_id)
            if company is None:
                raise NotFoundDomainError("Company not found")

        # Si no viene password, generamos uno temporal (flujo de invitación)
        password_to_hash = payload.password if payload.password else str(uuid.uuid4())[:12]

        user = User(
            nombre=payload.nombre.strip(),
            email=email,
            tipo_usuario=payload.tipo_usuario,
            company_id=payload.company_id,
            estado=payload.estado,
            password_hash=hash_password(password_to_hash),
            created_by_user_id=created_by_user_id,
            deactivated_at=deactivated_at,
        )
        created = UserRepository.create(db, user=user)
        db.commit()
        return cls._to_response(created)

    @classmethod
    def list_users(
        cls,
        db: Session,
        *,
        tipo_usuario: UserType | None,
        estado: UserStatus | None,
        search: str | None,
    ) -> UserListResponse:
        items, total = UserRepository.list_users(
            db,
            tipo_usuario=tipo_usuario,
            estado=estado,
            search=search,
        )
        return UserListResponse(total=total, items=[cls._to_response(item) for item in items])

    @classmethod
    def update_user(cls, db: Session, *, user_id: uuid.UUID, payload: UserUpdate) -> UserResponse:
        user = UserRepository.get_by_id(db, user_id=user_id)
        if user is None:
            raise NotFoundDomainError("User not found")

        if payload.nombre is None and payload.estado is None:
            raise ValidationDomainError("At least one field must be provided")

        if payload.nombre is not None:
            user.nombre = payload.nombre.strip()
        if payload.estado is not None:
            user.estado = payload.estado
            user.deactivated_at = (
                datetime.now(UTC) if payload.estado == UserStatus.INACTIVO else None
            )

        db.flush()
        db.commit()
        db.refresh(user)
        return cls._to_response(user)

    @classmethod
    def deactivate_user(
        cls,
        db: Session,
        *,
        user_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> UserResponse:
        if user_id == actor_user_id:
            raise ValidationDomainError("You cannot deactivate your own account")

        user = UserRepository.get_by_id(db, user_id=user_id)
        if user is None:
            raise NotFoundDomainError("User not found")
        if user.estado == UserStatus.INACTIVO:
            raise ConflictDomainError("User is already inactive")

        user.estado = UserStatus.INACTIVO
        user.deactivated_at = datetime.now(UTC)

        db.flush()
        db.commit()
        db.refresh(user)
        return cls._to_response(user)

    @classmethod
    def register_user(cls, db: Session, *, payload: UserRegisterRequest) -> UserResponse:
        email = payload.email.lower()
        existing = UserRepository.get_by_email(db, email=email)
        if existing is not None:
            raise ConflictDomainError("Email already registered")

        user = User(
            nombre=payload.nombre.strip(),
            email=email,
            tipo_usuario=payload.tipo_usuario,
            estado=UserStatus.ACTIVO,
            password_hash=hash_password(payload.password),
            created_by_user_id=None,
        )
        created = UserRepository.create(db, user=user)
        db.commit()
        return cls._to_response(created)
