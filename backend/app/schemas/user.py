from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import UserStatus, UserType


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=255)
    email: str  # Cambiado de EmailStr a str para permitir .local en desarrollo
    tipo_usuario: UserType
    company_id: UUID | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    estado: UserStatus = UserStatus.ACTIVO

    @model_validator(mode="after")
    def empresa_requires_company(self) -> UserCreate:
        if self.tipo_usuario == UserType.EMPRESA and self.company_id is None:
            raise ValueError("company_id is required for EMPRESA users")
        return self


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str | None = Field(default=None, min_length=1, max_length=255)
    estado: UserStatus | None = None


class UserResponse(BaseModel):
    id: UUID
    nombre: str
    email: str  # Cambiado de EmailStr a str para permitir .local en desarrollo
    tipo_usuario: UserType
    estado: UserStatus
    company_id: UUID | None = None
    created_by_user_id: UUID | None
    deactivated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    total: int
    items: list[UserResponse]
