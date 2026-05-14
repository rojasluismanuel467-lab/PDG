import uuid
from dataclasses import dataclass

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.enums import UserStatus, UserType
from app.core.security import parse_token_payload
from app.dependencies.db import get_db
from app.exceptions.domain import ForbiddenDomainError, UnauthorizedDomainError
from app.models.user import User
from app.repositories.auth_repository import AuthRepository


@dataclass
class CurrentUser:
    id: uuid.UUID
    tipo_usuario: UserType
    email: str
    estado: UserStatus
    nombre: str = ""


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _map_current_user(user: User) -> CurrentUser:
    return CurrentUser(
        id=user.id,
        tipo_usuario=user.tipo_usuario,
        email=user.email,
        estado=user.estado,
        nombre=user.nombre,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    payload = parse_token_payload(token)
    if payload.token_type != "access":
        raise UnauthorizedDomainError("Access token required")

    try:
        user_id = uuid.UUID(payload.sub)
    except ValueError as exc:
        raise UnauthorizedDomainError("Invalid user id in token") from exc

    user = AuthRepository.get_user_by_id(db, user_id=user_id)
    if user is None:
        raise UnauthorizedDomainError("User not found")
    if user.estado != UserStatus.ACTIVO:
        raise UnauthorizedDomainError("User is not active")

    return _map_current_user(user)


def get_current_user_model(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = AuthRepository.get_user_by_id(db, user_id=current_user.id)
    if user is None:
        raise UnauthorizedDomainError("User not found")
    return user


def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.tipo_usuario != UserType.ADMINISTRADOR:
        raise ForbiddenDomainError("Only ADMINISTRADOR can perform this action")
    return current_user


def require_admin_or_consultant(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if current_user.tipo_usuario not in [UserType.ADMINISTRADOR, UserType.CONSULTOR]:
        raise ForbiddenDomainError("Only ADMINISTRADOR or CONSULTOR can perform this action")
    return current_user
