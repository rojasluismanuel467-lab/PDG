from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TerminoGlosarioSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=120)
    termino: str = Field(min_length=1, max_length=255)
    definicion: str = Field(default="", max_length=5000)
    propietario: str = Field(default="", max_length=255)
    entidades_relacionadas: list[str] = Field(default_factory=list)
    sinonimos: list[str] = Field(default_factory=list)
    notas: str = Field(default="", max_length=5000)


class ComentarioGlosarioResponse(BaseModel):
    id: str
    referencia_id: str | None
    referencia_tipo: str
    autor_id: str
    autor_nombre: str
    autor_perfil: str
    contenido: str
    estado: str
    created_at: str


class VersionGlosarioResponse(BaseModel):
    version: str
    fecha: datetime
    autor: str
    descripcion_cambio: str | None
    total_terminos: int


class BusinessGlossarySnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=10000)
    terminos: list[TerminoGlosarioSchema] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=2000)


class AddGlossaryCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    referencia_id: str | None = None
    referencia_tipo: Literal["termino", "general"]
    contenido: str = Field(min_length=1, max_length=5000)


class BusinessGlossaryResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    entregable_id: UUID
    nombre: str
    descripcion: str
    terminos: list[TerminoGlosarioSchema]
    comentarios: list[ComentarioGlosarioResponse]
    version_actual: str
    historial_versiones: list[VersionGlosarioResponse]
    created_at: datetime
    updated_at: datetime
