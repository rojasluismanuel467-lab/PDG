from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DFDNodeSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=2, max_length=120)
    tipo: str = Field(pattern="^(proceso|almacen|entidad_externa)$")
    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=5000)
    numero_proceso: str | None = Field(default=None, max_length=40)
    ubicacion_proceso: str | None = Field(default=None, max_length=255)
    prefijo_almacen: str | None = Field(default=None, pattern="^(D|T|M)$")
    tipo_dato_almacen: str | None = Field(default=None, max_length=255)
    posicion_x: float
    posicion_y: float
    width: float | None = None
    height: float | None = None
    color: str | None = Field(default=None, max_length=32)
    fase: str | None = Field(default=None, max_length=120)
    categoria: str | None = Field(default=None, max_length=120)
    etiquetas: list[str] = Field(default_factory=list)


class DFDFlowSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=2, max_length=120)
    origen_id: str = Field(min_length=2, max_length=120)
    destino_id: str = Field(min_length=2, max_length=120)
    etiqueta: str = Field(min_length=1, max_length=255)
    datos_descripcion: str | None = Field(default=None, max_length=5000)
    datos_campos: list[str] = Field(default_factory=list)
    fase: str | None = Field(default=None, max_length=120)
    tipo_flujo: str | None = Field(default=None, pattern="^(entrada|salida|bidireccional)$")
    tipo_relacion: str | None = Field(
        default=None,
        pattern="^(linea|flecha_abierta|flecha_cerrada|doble_flecha)$",
    )
    estilo_linea: str | None = Field(
        default=None,
        pattern="^(rectilinear|oblique|curve|round_oblique|round_rectilinear)$",
    )
    source_handle: str | None = Field(default=None, max_length=120)
    target_handle: str | None = Field(default=None, max_length=120)


class DFDCommentResponse(BaseModel):
    id: UUID
    model_id: UUID
    target_type: str
    target_client_id: str | None
    content: str
    status: str
    created_by_user_id: UUID | None
    created_by_user_email: str
    created_by_user_name: str | None
    created_by_user_type: str
    created_in_version_number: int
    created_at: datetime
    updated_at: datetime


class DFDCommentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_type: str = Field(pattern="^(nodo|flujo)$")
    target_client_id: str | None = Field(default=None, max_length=120)
    content: str = Field(min_length=2, max_length=5000)


class DFDVersionResponse(BaseModel):
    id: UUID
    version_number: int
    created_at: datetime
    created_by_user_id: UUID | None
    created_by_user_email: str
    change_summary: str | None


class DFDVersionsResponse(BaseModel):
    model_id: UUID
    versions: list[DFDVersionResponse]


class DFDModelSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=10000)
    level: int = Field(ge=0, le=2)
    nodos: list[DFDNodeSchema] = Field(default_factory=list)
    flujos: list[DFDFlowSchema] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=2000)


class DFDModelResponse(BaseModel):
    id: UUID
    project_id: UUID
    artifact_id: UUID
    phase: str
    name: str
    description: str
    level: int
    nodos: list[DFDNodeSchema]
    flujos: list[DFDFlowSchema]
    comentarios: list[DFDCommentResponse]
    version_actual: str
    current_version_number: int
    historial_versiones: list[DFDVersionResponse]
    created_at: datetime
    updated_at: datetime
    last_saved_at: datetime


class DFDVersionPreviewResponse(BaseModel):
    model_id: UUID
    source_version_number: int
    snapshot: DFDModelSnapshotRequest


class DFDRestoreVersionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_version_number: int = Field(ge=1)
    change_summary: str | None = Field(default=None, max_length=2000)
