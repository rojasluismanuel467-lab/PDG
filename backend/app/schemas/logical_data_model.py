from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LogicalColumnSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=2, max_length=120)
    nombre: str = Field(min_length=1, max_length=255)
    tipo_dato: str = Field(min_length=1, max_length=60)
    descripcion: str = Field(default="", max_length=5000)
    es_pk: bool = False
    es_fk: bool = False
    es_nullable: bool = True
    es_unique: bool = False
    orden: int = Field(ge=0)


class LogicalTableSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=2, max_length=120)
    nombre: str = Field(min_length=1, max_length=255)
    esquema: str = Field(min_length=1, max_length=100)
    descripcion: str = Field(default="", max_length=10000)
    columnas: list[LogicalColumnSchema] = Field(default_factory=list)
    indices: list[dict] = Field(default_factory=list)
    constraints: list[dict] = Field(default_factory=list)


class LogicalVersionResponse(BaseModel):
    id: UUID
    version_number: int
    created_at: datetime
    created_by_user_id: UUID | None
    created_by_user_email: str
    change_summary: str | None


class LogicalVersionsResponse(BaseModel):
    model_id: UUID
    versions: list[LogicalVersionResponse]


class LogicalModelSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=10000)
    tablas: list[LogicalTableSchema] = Field(default_factory=list)
    sql_ddl: str = Field(default="", max_length=2_000_000)
    notas_markdown: str = Field(default="", max_length=2_000_000)
    change_summary: str | None = Field(default=None, max_length=2000)


class LogicalDataModelUpsertRequest(LogicalModelSnapshotRequest):
    pass


class LogicalVersionPreviewResponse(BaseModel):
    model_id: UUID
    source_version_number: int
    snapshot: LogicalModelSnapshotRequest


class LogicalRestoreVersionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_version_number: int = Field(ge=1)
    change_summary: str | None = Field(default=None, max_length=2000)


class LogicalCommentResponse(BaseModel):
    id: UUID
    model_id: UUID
    target_type: str
    target_client_id: str
    content: str
    status: str
    created_by_user_id: UUID | None
    created_by_user_email: str
    created_by_user_name: str | None
    created_by_user_type: str
    created_in_version_number: int
    created_at: datetime
    updated_at: datetime


class LogicalCommentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_type: str = Field(pattern="^(tabla|columna)$")
    target_client_id: str = Field(min_length=2, max_length=120)
    content: str = Field(min_length=2, max_length=5000)


class LogicalDataModelResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    entregable_id: UUID
    fase: str
    nombre: str
    descripcion: str
    tablas: list[LogicalTableSchema]
    sql_ddl: str
    notas_markdown: str
    comentarios: list[LogicalCommentResponse]
    version_actual: str
    versiones: list[dict]
    created_at: datetime
    updated_at: datetime
