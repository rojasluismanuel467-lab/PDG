from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import UserStatus, UserType


class AuthLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class UserRegisterRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    email: str
    password: str = Field(min_length=8, max_length=128)
    tipo_usuario: UserType


class AuthRefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class AuthLogoutRequest(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=20)


class ActivateInvitationRequest(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=8, max_length=128)
    nombre: str | None = Field(default=None, min_length=1, max_length=255)


class AuthUserResponse(BaseModel):
    id: UUID
    nombre: str
    email: str
    tipo_usuario: UserType
    estado: UserStatus


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime


class AuthLoginResponse(BaseModel):
    user: AuthUserResponse
    tokens: TokenPairResponse


class AuthRefreshResponse(BaseModel):
    tokens: TokenPairResponse


class AuthMessageResponse(BaseModel):
    message: str


class AuthLogoutResponse(BaseModel):
    message: str
    revoked_tokens: int
