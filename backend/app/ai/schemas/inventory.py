from __future__ import annotations

from pydantic import BaseModel, Field


class AISystemSuggestion(BaseModel):
    """Un sistema identificado por el AI para el inventario."""

    id: str = Field(description="Identificador único del sistema, snake_case, sin espacios")
    nombre: str = Field(description="Nombre del sistema o aplicación")
    tipo: str = Field(
        description="Tipo: aplicacion | base_de_datos | plataforma | servicio_externo | infraestructura"
    )
    descripcion: str = Field(description="Qué hace este sistema en el contexto del negocio")
    tecnologia: str | None = Field(default=None, description="Stack tecnológico principal")
    proveedor: str | None = Field(default=None, description="Empresa proveedora o fabricante")
    propietario_negocio: str | None = Field(default=None, description="Área o persona responsable")
    criticidad: str | None = Field(
        default=None, description="Nivel: critico | alto | medio | bajo"
    )
    estado: str | None = Field(
        default=None,
        description="Estado: produccion | desarrollo | mantenimiento | legado | deprecado",
    )
    datos_que_maneja: list[str] = Field(
        default_factory=list, description="Tipos de datos o entidades que gestiona"
    )
    razon_inclusion: str = Field(
        description="Por qué el AI incluyó este sistema — basado en qué evidencia del contexto"
    )


class AIInventorySuggestion(BaseModel):
    """Resultado del AI para el artefacto Inventario de Sistemas (ASIS o TOBE)."""

    sistemas: list[AISystemSuggestion] = Field(
        description="Lista de sistemas identificados", min_length=1
    )
    notas_generales: str = Field(
        description="Observaciones generales sobre el inventario, patrones detectados o limitaciones del análisis"
    )
    confianza: str = Field(
        description="Nivel de confianza: alto | medio | bajo — con explicación breve de por qué"
    )
