from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TipoSistema(StrEnum):
    APLICACION = "aplicacion"
    BASE_DE_DATOS = "base_de_datos"
    PLATAFORMA = "plataforma"
    SERVICIO_EXTERNO = "servicio_externo"
    INFRAESTRUCTURA = "infraestructura"


class EstadoSistema(StrEnum):
    PRODUCCION = "produccion"
    DESARROLLO = "desarrollo"
    MANTENIMIENTO = "mantenimiento"
    LEGADO = "legado"
    DEPRECADO = "deprecado"


class NivelCriticidad(StrEnum):
    CRITICO = "critico"
    ALTO = "alto"
    MEDIO = "medio"
    BAJO = "bajo"


class SistemaInventarioSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=120)
    nombre: str = Field(min_length=1, max_length=255)
    tipo: TipoSistema
    descripcion: str = Field(default="", max_length=5000)
    tecnologia: str | None = Field(default=None, max_length=255)
    version: str | None = Field(default=None, max_length=100)
    proveedor: str | None = Field(default=None, max_length=255)
    propietario_negocio: str | None = Field(default=None, max_length=255)
    propietario_tecnico: str | None = Field(default=None, max_length=255)
    criticidad: NivelCriticidad | None = None
    estado: EstadoSistema | None = None
    ambientes: list[str] = Field(default_factory=list)
    datos_que_maneja: list[str] = Field(default_factory=list)
    areas_estrategicas: list[str] | None = None
    notas: str | None = Field(default=None, max_length=5000)


class ComentarioInventarioResponse(BaseModel):
    id: str
    referencia_id: str | None
    referencia_tipo: str
    campo: str | None = None
    autor_id: str
    autor_nombre: str
    autor_perfil: str
    contenido: str
    estado: str
    created_at: str


class VersionInventarioResponse(BaseModel):
    version: str
    fecha: datetime
    autor: str
    descripcion_cambio: str | None
    total_sistemas: int


class InventoryMatrixSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=10000)
    sistemas: list[SistemaInventarioSchema] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=2000)


class AddInventoryCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    referencia_id: str | None = None
    referencia_tipo: Literal["sistema", "general", "celda"]
    campo: str | None = None
    contenido: str = Field(min_length=1, max_length=5000)


class InventoryMatrixResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    entregable_id: UUID
    nombre: str
    descripcion: str
    sistemas: list[SistemaInventarioSchema]
    comentarios: list[ComentarioInventarioResponse]
    version_actual: str
    historial_versiones: list[VersionInventarioResponse]
    created_at: datetime
    updated_at: datetime
