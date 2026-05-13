import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.enums import UserStatus, UserType
from app.dependencies.auth import CurrentUser, require_admin, require_admin_or_consultant
from app.dependencies.db import get_db
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> UserResponse:
    return UserService.create_user(
        db,
        payload=payload,
        created_by_user_id=current_user.id,
    )


@router.get("", response_model=UserListResponse)
def list_users(
    tipo_usuario: UserType | None = Query(default=None),
    estado: UserStatus | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_consultant),
) -> UserListResponse:
    return UserService.list_users(
        db,
        tipo_usuario=tipo_usuario,
        estado=estado,
        search=search,
    )


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
) -> UserResponse:
    return UserService.update_user(db, user_id=user_id, payload=payload)


@router.patch("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> UserResponse:
    return UserService.deactivate_user(
        db,
        user_id=user_id,
        actor_user_id=current_user.id,
    )
