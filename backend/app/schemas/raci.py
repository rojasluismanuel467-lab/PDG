from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import RaciAssignmentType, RaciCommentReferenceType, RaciStatus


# ----------------- #
# Version History   #
# ----------------- #
class RaciVersionHistoryResponse(BaseModel):
    version: str
    fecha: datetime = Field(alias="created_at")
    autor: str
    descripcion_cambio: str
    total_actividades: int
    total_roles: int

    model_config = ConfigDict(from_attributes=True)


# ----------------- #
# Comment           #
# ----------------- #
class RaciCommentCreate(BaseModel):
    referencia_id: UUID | None = None
    referencia_tipo: RaciCommentReferenceType
    contenido: str


class RaciCommentResponse(BaseModel):
    id: UUID
    referencia_id: UUID | None = None
    referencia_tipo: RaciCommentReferenceType
    autor_id: UUID
    autor_nombre: str
    autor_perfil: str
    contenido: str
    estado: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RaciBulkActivity(BaseModel):
    id: UUID
    name: str = Field(alias="nombre")
    description: str | None = Field(None, alias="descripcion")
    category: str = Field(alias="categoria")
    notas: str | None = None
    asignaciones: dict[str, str] = Field(default_factory=dict)


class RaciBulkRole(BaseModel):
    id: UUID
    name: str = Field(alias="nombre")
    area: str | None = None
    description: str | None = Field(None, alias="descripcion")


class RaciBulkUpdate(BaseModel):
    nombre: str
    descripcion: str | None = None
    roles: list[RaciBulkRole] = []
    actividades: list[RaciBulkActivity] = []


# ----------------- #
# Role              #
# ----------------- #
class RaciRoleCreate(BaseModel):
    name: str = Field(alias="nombre")
    area: str | None = None
    description: str | None = Field(None, alias="descripcion")


class RaciRoleUpdate(BaseModel):
    name: str | None = Field(None, alias="nombre")
    area: str | None = None
    description: str | None = Field(None, alias="descripcion")
    order_index: int | None = None


class RaciRoleResponse(BaseModel):
    id: UUID
    nombre: str = Field(validation_alias="name")
    area: str | None = None
    descripcion: str | None = Field(validation_alias="description")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ----------------- #
# Activity & Assign #
# ----------------- #


class RaciAssignmentUpdate(BaseModel):
    role_id: UUID
    assignment_type: RaciAssignmentType | None = None  # Si es null, equivale a remover


class RaciActivityCreate(BaseModel):
    name: str = Field(alias="nombre")
    description: str | None = Field(None, alias="descripcion")
    category: str = Field(alias="categoria")
    notas: str | None = None
    # No asignaciones here


class RaciActivityUpdate(BaseModel):
    name: str | None = Field(None, alias="nombre")
    description: str | None = Field(None, alias="descripcion")
    category: str | None = Field(None, alias="categoria")
    notas: str | None = None
    order_index: int | None = None


class RaciActivityResponse(BaseModel):
    id: UUID
    nombre: str = Field(validation_alias="name")
    descripcion: str | None = Field(validation_alias="description")
    categoria: str = Field(validation_alias="category")
    notas: str | None = None
    asignaciones: dict[str, str] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ----------------- #
# Matrix            #
# ----------------- #
class RaciMatrixCreate(BaseModel):
    project_id: UUID
    entregable_id: UUID | None = None
    name: str = Field(alias="nombre")
    description: str | None = Field(None, alias="descripcion")


class RaciMatrixUpdate(BaseModel):
    name: str | None = Field(None, alias="nombre")
    description: str | None = Field(None, alias="descripcion")
    status: RaciStatus | None = None


class RaciMatrixResponse(BaseModel):
    id: UUID
    proyecto_id: UUID = Field(validation_alias="project_id")
    entregable_id: UUID | None = None
    nombre: str = Field(validation_alias="name")
    descripcion: str | None = Field(validation_alias="description")
    version_actual: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RaciGridResponse(RaciMatrixResponse):
    roles: list[RaciRoleResponse] = []
    actividades: list[RaciActivityResponse] = []
    comentarios: list[RaciCommentResponse] = []
    historial_versiones: list[RaciVersionHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
