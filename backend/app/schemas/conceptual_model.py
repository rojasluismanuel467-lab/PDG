from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ProjectBlock

CARDINALITY_VALUES = {"1:1", "1:N", "N:1", "N:M"}
COMMENT_TARGET_TYPES = {"entity", "relation", "general"}
COMMENT_STATUS_VALUES = {"open", "resolved"}


class ConceptualAttributePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=255)
    data_type: str = Field(min_length=1, max_length=50)
    is_pk: bool
    is_fk: bool
    is_nullable: bool
    description: str | None = Field(default=None, max_length=5000)
    fk_entity_ref: str | None = Field(default=None, min_length=1, max_length=120)
    fk_attribute_ref: str | None = Field(default=None, min_length=1, max_length=255)


class ConceptualEntityPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=5000)
    position_x: float
    position_y: float
    color: str | None = Field(default=None, max_length=20)
    attributes: list[ConceptualAttributePayload] = Field(default_factory=list)


class ConceptualRelationPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=255)
    source_entity_id: str = Field(min_length=1, max_length=120)
    target_entity_id: str = Field(min_length=1, max_length=120)
    cardinality: str = Field(min_length=3, max_length=10)
    description: str | None = Field(default=None, max_length=5000)
    fk_attribute_id: str | None = Field(default=None, min_length=1, max_length=120)


class ConceptualModelUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=255)
    description: str = Field(default="", max_length=5000)
    entities: list[ConceptualEntityPayload] = Field(default_factory=list)
    relations: list[ConceptualRelationPayload] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=5000)


class ConceptualModelRestoreVersionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_version_number: int = Field(ge=1)
    change_summary: str | None = Field(default=None, max_length=5000)


class ConceptualCommentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_type: str = Field(min_length=3, max_length=20)
    target_client_id: str | None = Field(default=None, min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=5000)


class ConceptualCommentUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str | None = Field(default=None, min_length=1, max_length=5000)
    status: str | None = Field(default=None, min_length=4, max_length=20)


class ConceptualCommentResponse(BaseModel):
    id: UUID
    model_id: UUID
    target_type: str
    target_client_id: str | None = None
    content: str
    status: str
    created_in_version_number: int | None = None
    outdated_at: datetime | None = None
    is_outdated: bool = False
    created_by_user_id: UUID
    created_by_user_email: str
    created_by_user_name: str
    created_by_user_type: str
    created_at: datetime
    updated_at: datetime


class ConceptualAttributeResponse(BaseModel):
    id: str
    name: str
    data_type: str
    is_pk: bool
    is_fk: bool
    is_nullable: bool
    description: str | None = None
    fk_entity_ref: str | None = None
    fk_attribute_ref: str | None = None


class ConceptualEntityResponse(BaseModel):
    id: str
    name: str
    description: str
    position_x: float
    position_y: float
    color: str | None = None
    attributes: list[ConceptualAttributeResponse]


class ConceptualRelationResponse(BaseModel):
    id: str
    name: str
    source_entity_id: str
    target_entity_id: str
    cardinality: str
    description: str | None = None
    fk_attribute_id: str | None = None


class ConceptualModelResponse(BaseModel):
    id: UUID
    project_id: UUID
    artifact_id: UUID
    phase: ProjectBlock
    name: str
    description: str
    entities: list[ConceptualEntityResponse]
    relations: list[ConceptualRelationResponse]
    comments: list[ConceptualCommentResponse] = Field(default_factory=list)
    current_version_number: int
    created_at: datetime
    updated_at: datetime
    last_saved_at: datetime | None = None


class ConceptualModelVersionItem(BaseModel):
    id: UUID
    version_number: int
    created_at: datetime
    created_by_user_id: UUID
    created_by_user_email: str
    change_summary: str | None = None


class ConceptualModelVersionsResponse(BaseModel):
    model_id: UUID
    versions: list[ConceptualModelVersionItem]


class ConceptualVersionPreviewResponse(BaseModel):
    model_id: UUID
    source_version_number: int
    snapshot: ConceptualModelUpsertRequest


class ConceptualModelCommentsResponse(BaseModel):
    model_id: UUID
    comments: list[ConceptualCommentResponse]
