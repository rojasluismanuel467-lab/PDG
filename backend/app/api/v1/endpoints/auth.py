from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user_model
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.auth import (
    ActivateInvitationRequest,
    AuthLoginRequest,
    AuthLoginResponse,
    AuthLogoutRequest,
    AuthLogoutResponse,
    AuthRefreshRequest,
    AuthRefreshResponse,
    AuthUserResponse,
    UserRegisterRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthLoginResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)) -> AuthLoginResponse:
    return AuthService.login(db, email=payload.email, password=payload.password)


@router.post("/refresh", response_model=AuthRefreshResponse)
def refresh(payload: AuthRefreshRequest, db: Session = Depends(get_db)) -> AuthRefreshResponse:
    return AuthService.refresh(db, refresh_token=payload.refresh_token)


@router.post("/logout", response_model=AuthLogoutResponse)
def logout(
    payload: AuthLogoutRequest | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_model),
) -> AuthLogoutResponse:
    revoked_tokens = AuthService.logout(
        db,
        current_user=current_user,
        refresh_token=payload.refresh_token if payload else None,
    )
    return AuthLogoutResponse(
        message="Logout successful",
        revoked_tokens=revoked_tokens,
    )


@router.get("/me", response_model=AuthUserResponse)
def me(current_user: User = Depends(get_current_user_model)) -> AuthUserResponse:
    return AuthService.get_current_user_profile(current_user)


@router.post("/activate-invitation", response_model=AuthLoginResponse)
def activate_invitation(
    payload: ActivateInvitationRequest,
    db: Session = Depends(get_db),
) -> AuthLoginResponse:
    return AuthService.activate_invitation(db, payload=payload)


@router.post("/register", response_model=UserResponse, status_code=201)
def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    return UserService.register_user(db, payload=payload)
