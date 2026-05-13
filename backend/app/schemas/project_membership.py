from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import UserStatus, UserType


class ProjectPermissionLevels(BaseModel):
    project_permission_level: int | None = Field(default=None, ge=0, le=5)
    nivel_asis: int | None = Field(default=None, ge=0, le=5)
    nivel_tobe: int | None = Field(default=None, ge=0, le=5)
    nivel_brechas: int | None = Field(default=None, ge=0, le=5)
    nivel_roadmap: int | None = Field(default=None, ge=0, le=5)


class InviteProjectMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    tipo_usuario: UserType
    nombre: str | None = Field(default=None, min_length=1, max_length=255)
    project_permission_level: int | None = Field(default=None, ge=0, le=5)
    nivel_asis: int | None = Field(default=None, ge=0, le=5)
    nivel_tobe: int | None = Field(default=None, ge=0, le=5)
    nivel_brechas: int | None = Field(default=None, ge=0, le=5)
    nivel_roadmap: int | None = Field(default=None, ge=0, le=5)


class UpdateProjectMemberPermissionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_permission_level: int | None = Field(default=None, ge=0, le=5)
    nivel_asis: int | None = Field(default=None, ge=0, le=5)
    nivel_tobe: int | None = Field(default=None, ge=0, le=5)
    nivel_brechas: int | None = Field(default=None, ge=0, le=5)
    nivel_roadmap: int | None = Field(default=None, ge=0, le=5)

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> UpdateProjectMemberPermissionsRequest:
        if (
            self.project_permission_level is None
            and self.nivel_roadmap is None
            and self.nivel_asis is None
            and self.nivel_tobe is None
            and self.nivel_brechas is None
        ):
            raise ValueError("At least one permission field must be provided")
        return self


class UpdateArtifactPermissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    permission_level: int = Field(ge=0, le=5)


class ArtifactPermissionResponse(BaseModel):
    artifact_id: UUID
    project_id: UUID
    user_id: UUID
    permission_level: int
    assigned_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


class ArtifactPermissionsListResponse(BaseModel):
    items: list[ArtifactPermissionResponse]


class ProjectMemberResponse(BaseModel):
    membership_id: UUID
    project_id: UUID
    user_id: UUID
    nombre: str
    email: str
    tipo_usuario: UserType
    estado_usuario: UserStatus
    is_manager: bool
    assigned_by_user_id: UUID | None
    permisos: ProjectPermissionLevels
    created_at: datetime
    updated_at: datetime


class ProjectMembersListResponse(BaseModel):
    total: int
    items: list[ProjectMemberResponse]


class InviteProjectMemberResponse(BaseModel):
    message: str
    member: ProjectMemberResponse
    invitation_token: str | None
    invitation_expires_at: datetime | None


class RemoveProjectMemberResponse(BaseModel):
    message: str
