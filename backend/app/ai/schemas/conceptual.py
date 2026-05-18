from __future__ import annotations

from pydantic import BaseModel, Field


class AIAttributeSuggestion(BaseModel):
    nombre: str = Field(description="Nombre del atributo")
    tipo_dato: str = Field(description="Tipo de dato: texto, número, fecha, booleano, etc.")
    descripcion: str = Field(default="", description="Qué representa este atributo")
    es_clave: bool = Field(default=False, description="True si es identificador principal")


class AIEntitySuggestion(BaseModel):
    """Una entidad de negocio identificada por el AI."""

    client_id: str = Field(description="Identificador único, snake_case, sin espacios")
    nombre: str = Field(description="Nombre de la entidad de negocio")
    descripcion: str = Field(description="Qué representa esta entidad en el dominio del negocio")
    atributos: list[AIAttributeSuggestion] = Field(
        default_factory=list, description="Atributos principales de la entidad"
    )
    razon_inclusion: str = Field(
        description="Evidencia del contexto que justifica incluir esta entidad"
    )


class AIRelationSuggestion(BaseModel):
    """Una relación entre dos entidades."""

    desde: str = Field(description="client_id de la entidad origen")
    hacia: str = Field(description="client_id de la entidad destino")
    etiqueta: str = Field(description="Verbo o frase que describe la relación")
    cardinalidad: str = Field(
        description=(
            "Cardinalidad usando notación estándar. "
            "Valores permitidos EXACTAMENTE: '1:1' | '1:N' | 'N:1' | 'N:M'. "
            "Usa '1:N' para uno-a-muchos, 'N:M' para muchos-a-muchos, '1:1' para uno-a-uno."
        )
    )
    descripcion: str = Field(default="", description="Descripción adicional de la relación")


class AIConceptualSuggestion(BaseModel):
    """Resultado del AI para el Modelo Conceptual (ASIS o TOBE)."""

    entidades: list[AIEntitySuggestion] = Field(
        description="Entidades de negocio identificadas", min_length=1
    )
    relaciones: list[AIRelationSuggestion] = Field(
        default_factory=list, description="Relaciones entre entidades"
    )
    notas_generales: str = Field(
        description="Observaciones sobre el modelo, supuestos realizados o áreas de incertidumbre"
    )
    confianza: str = Field(
        description="Nivel de confianza: alto | medio | bajo — con explicación breve"
    )
