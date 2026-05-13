from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BrechaImpacto(StrEnum):
    ALTO = "Alto"
    MEDIO = "Medio"
    BAJO = "Bajo"


class BrechaPrioridad(StrEnum):
    CRITICA = "Critica"
    ALTA = "Alta"
    MEDIA = "Media"
    BAJA = "Baja"


class IntegrationRuleType(StrEnum):
    MATCHING = "Matching"
    VALIDACION = "Validacion"
    CONSOLIDACION = "Consolidacion"


class IntegrationRulePriority(StrEnum):
    ALTA = "Alta"
    MEDIA = "Media"
    BAJA = "Baja"


class ExportFormat(StrEnum):
    MARKDOWN = "markdown"
    PDF = "pdf"
    WORD = "word"


class CRUDComparisonSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=2, max_length=120)
    entidad: str = Field(min_length=1, max_length=255)
    asis_create: bool
    asis_read: bool
    asis_update: bool
    asis_delete: bool
    tobe_create: bool
    tobe_read: bool
    tobe_update: bool
    tobe_delete: bool
    brecha: str = Field(default="", max_length=5000)
    impacto: BrechaImpacto


class BrechasVersionResponse(BaseModel):
    version: str
    fecha: datetime
    autor: str
    descripcion_cambio: str | None


class CRUDMatrixSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=10000)
    comparaciones: list[CRUDComparisonSchema] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=2000)


class CRUDMatrixResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    entregable_id: UUID
    nombre: str
    descripcion: str
    comparaciones: list[CRUDComparisonSchema]
    version_actual: str
    historial_versiones: list[BrechasVersionResponse]
    created_at: datetime
    updated_at: datetime


class GapSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=2, max_length=120)
    area: str = Field(min_length=1, max_length=255)
    brecha: str = Field(min_length=1, max_length=5000)
    impacto: BrechaImpacto
    prioridad: BrechaPrioridad
    recomendacion: str = Field(min_length=1, max_length=5000)


class GapAnalysisReportSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=10000)
    resumen_ejecutivo: str = Field(default="", max_length=12000)
    brechas: list[GapSchema] = Field(default_factory=list)
    total_brechas: int = Field(ge=0)
    brechas_criticas: int = Field(ge=0)
    recomendaciones_prioritarias: list[str] = Field(default_factory=list)
    formato_objetivo: list[str] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_counts(self) -> GapAnalysisReportSnapshotRequest:
        if self.total_brechas < len(self.brechas):
            raise ValueError("total_brechas cannot be lower than brechas length")
        return self


class GapAnalysisReportResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    entregable_id: UUID
    nombre: str
    descripcion: str
    resumen_ejecutivo: str
    brechas: list[GapSchema]
    total_brechas: int
    brechas_criticas: int
    recomendaciones_prioritarias: list[str]
    formato_objetivo: list[str]
    version_actual: str
    historial_versiones: list[BrechasVersionResponse]
    created_at: datetime
    updated_at: datetime


class IntegrationRuleSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=2, max_length=120)
    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=5000)
    tipo: IntegrationRuleType
    prioridad: IntegrationRulePriority
    condicion: str = Field(min_length=1, max_length=5000)
    accion: str = Field(min_length=1, max_length=5000)


class IntegrationQualityRulesSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(default="", max_length=10000)
    resumen_tecnico: str = Field(default="", max_length=12000)
    reglas: list[IntegrationRuleSchema] = Field(default_factory=list)
    criterios_aceptacion: list[str] = Field(default_factory=list)
    formato_objetivo: list[str] = Field(default_factory=list)
    change_summary: str | None = Field(default=None, max_length=2000)


class IntegrationQualityRulesResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    entregable_id: UUID
    nombre: str
    descripcion: str
    resumen_tecnico: str
    reglas: list[IntegrationRuleSchema]
    criterios_aceptacion: list[str]
    formato_objetivo: list[str]
    version_actual: str
    historial_versiones: list[BrechasVersionResponse]
    created_at: datetime
    updated_at: datetime


class ExportDocumentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    formato: ExportFormat
