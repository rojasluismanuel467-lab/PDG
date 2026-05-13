from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import ProjectArtifactStatus, ProjectBlock, ProjectStatus



class ProjectArtifactSummary(BaseModel):
    total: int
    approved: int
    not_applicable: int


class ProjectArtifactResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: str
    block: ProjectBlock
    order_index: int
    block_order: int
    status: ProjectArtifactStatus
    is_applicable: bool
    consultant_approved: bool
    company_approved: bool
    consultant_approved_at: datetime | None
    company_approved_at: datetime | None
    approved_at: datetime | None
    approved_by_user_id: UUID | None
    review_cycles: int
    last_rejection_reason: str | None
    effective_permission_level: int
    created_at: datetime
    updated_at: datetime


class ProjectCompanyResponse(BaseModel):
    name: str
    email: str


class ProjectManagerResponse(BaseModel):
    id: UUID
    name: str


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    client_company: ProjectCompanyResponse
    estimated_end_date: date
    status: ProjectStatus
    manager: ProjectManagerResponse
    progress: int
    artifacts: ProjectArtifactSummary
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    total: int
    items: list[ProjectResponse]


class ProjectDetailResponse(ProjectResponse):
    artifact_items: list[ProjectArtifactResponse]


class CreateProjectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    company_id: UUID
    estimated_end_date: date


class UpdateProjectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    company_id: UUID | None = None
    estimated_end_date: date | None = None
    status: ProjectStatus | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> UpdateProjectRequest:
        if (
            self.name is None
            and self.description is None
            and self.company_id is None
            and self.estimated_end_date is None
            and self.status is None
        ):
            raise ValueError("At least one field must be provided")
        return self


class UpdateArtifactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ProjectArtifactStatus | None = None
    is_applicable: bool | None = None
    consultant_approved: bool | None = None
    company_approved: bool | None = None
    last_rejection_reason: str | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> UpdateArtifactRequest:
        if (
            self.status is None
            and self.is_applicable is None
            and self.consultant_approved is None
            and self.company_approved is None
            and self.last_rejection_reason is None
        ):
            raise ValueError("At least one artifact field must be provided")
        return self


class ProjectArtifactsListResponse(BaseModel):
    total: int
    items: list[ProjectArtifactResponse]


class ArtifactReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    approved: bool
    reason: str | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def validate_reason(self) -> ArtifactReviewRequest:
        if self.approved is False and (self.reason is None or not self.reason.strip()):
            raise ValueError("reason is required when approved is false")
        return self
