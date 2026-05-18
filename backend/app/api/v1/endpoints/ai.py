from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.chains.asis import generate_asis_conceptual, generate_asis_inventory
from app.ai.chains.tobe import generate_tobe_conceptual, generate_tobe_inventory
from app.ai.tools.artifact_reader import (
    collect_asis_context,
    collect_tobe_context,
    read_questionnaire_as_text,
)
from app.core.config import settings
from app.dependencies.auth import CurrentUser, require_admin_or_consultant
from app.dependencies.db import get_db
from app.exceptions.domain import NotFoundDomainError
from app.models.project import Project

router = APIRouter(prefix="/projects", tags=["AI"])

_ASIS_SUPPORTED = {"ASIS_SYSTEM_INVENTORY_MATRIX", "ASIS_CONCEPTUAL_DIAGRAM"}
_TOBE_SUPPORTED = {"TOBE_SYSTEM_INVENTORY_MATRIX", "TOBE_CONCEPTUAL_DIAGRAM"}


class AIGenerateRequest(BaseModel):
    context_text: str = ""
    consultant_note: str = ""
    doc_language: str = ""


def _check_ai_enabled() -> None:
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI layer deshabilitado en esta instancia.")


def _get_project(db: Session, project_id: uuid.UUID) -> Project:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if project is None:
        raise NotFoundDomainError("Proyecto no encontrado")
    return project


def _build_asis_context(
    db: Session,
    *,
    project_id: uuid.UUID,
    manual_text: str,
    rag_query: str,
) -> str:
    """Combina cuestionario + RAG de documentos + texto manual en un solo bloque de contexto."""
    parts: list[str] = []

    questionnaire = read_questionnaire_as_text(db, project_id=project_id)
    if questionnaire:
        parts.append(questionnaire)

    try:
        from app.core.database import is_postgres
        if is_postgres():
            from app.ai.tools.document_retriever import retrieve_context
            rag = retrieve_context(project_id, rag_query)
            if rag:
                parts.append(f"Extractos de documentos del proyecto:\n{rag}")
    except Exception:
        pass

    if manual_text.strip():
        parts.append(f"Contexto adicional del consultor:\n{manual_text.strip()}")

    return "\n\n".join(parts) if parts else "Sin contexto disponible aún."


@router.post("/{project_id}/ai/asis/{artifact_code}/generate")
async def generate_asis_artifact(
    project_id: uuid.UUID,
    artifact_code: str,
    body: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_consultant),
):
    """
    Genera un borrador AI del artefacto AS-IS indicado.

    Fuentes de contexto (automáticas):
    - Cuestionario de madurez respondido por la empresa
    - Documentos subidos al proyecto (RAG/pgvector)
    - context_text: texto adicional que el consultor puede pegar manualmente
    - Los demás artefactos AS-IS ya guardados se incluyen para garantizar coherencia

    Códigos soportados: ASIS_SYSTEM_INVENTORY_MATRIX, ASIS_CONCEPTUAL_DIAGRAM
    """
    _check_ai_enabled()

    if artifact_code not in _ASIS_SUPPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"artifact_code '{artifact_code}' no soportado. "
            f"Disponibles: {sorted(_ASIS_SUPPORTED)}",
        )

    project = _get_project(db, project_id)
    lang = body.doc_language or "No especificado — detecta automáticamente el idioma del contexto"

    rag_query = (
        f"sistemas aplicaciones plataformas tecnología {project.nombre} {project.client_company_name}"
        if artifact_code == "ASIS_SYSTEM_INVENTORY_MATRIX"
        else f"entidades negocio datos dominios procesos {project.nombre} {project.client_company_name}"
    )

    context = _build_asis_context(
        db, project_id=project_id, manual_text=body.context_text, rag_query=rag_query
    )
    existing_asis = collect_asis_context(db, project_id=project_id)

    if artifact_code == "ASIS_SYSTEM_INVENTORY_MATRIX":
        result = await generate_asis_inventory(
            project_name=project.nombre,
            client_name=project.client_company_name,
            context=context,
            existing_asis_context=existing_asis,
            consultant_note=body.consultant_note,
            doc_language=lang,
        )
    else:
        result = await generate_asis_conceptual(
            project_name=project.nombre,
            client_name=project.client_company_name,
            context=context,
            existing_asis_context=existing_asis,
            consultant_note=body.consultant_note,
            doc_language=lang,
        )

    return {
        "artifact_code": artifact_code,
        "project_id": str(project_id),
        "suggestion": result.model_dump(),
    }


@router.post("/{project_id}/ai/tobe/{artifact_code}/generate")
async def generate_tobe_artifact(
    project_id: uuid.UUID,
    artifact_code: str,
    body: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_consultant),
):
    """
    Genera un borrador AI del artefacto TO-BE indicado.

    Fuentes de contexto (automáticas):
    - Todos los artefactos AS-IS guardados (inventario, modelo conceptual)
    - Cuestionario de madurez AS-IS
    - Documentos subidos al proyecto (RAG/pgvector)
    - Los TO-BE ya generados se incluyen para garantizar coherencia entre artefactos

    Códigos soportados: TOBE_SYSTEM_INVENTORY_MATRIX, TOBE_CONCEPTUAL_DIAGRAM
    """
    _check_ai_enabled()

    if artifact_code not in _TOBE_SUPPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"artifact_code '{artifact_code}' no soportado. "
            f"Disponibles: {sorted(_TOBE_SUPPORTED)}",
        )

    project = _get_project(db, project_id)

    # AS-IS context: cuestionario + artefactos AS-IS guardados
    asis_context = collect_asis_context(db, project_id=project_id)

    # Enriquecer con RAG de documentos
    try:
        from app.core.database import is_postgres
        if is_postgres():
            from app.ai.tools.document_retriever import retrieve_context
            rag_query = (
                f"arquitectura futura sistemas mejoras {project.nombre} {project.client_company_name}"
            )
            rag = retrieve_context(project_id, rag_query)
            if rag:
                asis_context = asis_context + f"\n\nExtractos de documentos del proyecto:\n{rag}"
    except Exception:
        pass

    if body.context_text.strip():
        asis_context = asis_context + f"\n\nContexto adicional del consultor:\n{body.context_text.strip()}"

    tobe_context = collect_tobe_context(db, project_id=project_id)

    if artifact_code == "TOBE_SYSTEM_INVENTORY_MATRIX":
        result = await generate_tobe_inventory(
            project_name=project.nombre,
            client_name=project.client_company_name,
            asis_context=asis_context,
            tobe_context=tobe_context,
            consultant_note=body.consultant_note,
        )
    else:
        result = await generate_tobe_conceptual(
            project_name=project.nombre,
            client_name=project.client_company_name,
            asis_context=asis_context,
            tobe_context=tobe_context,
            consultant_note=body.consultant_note,
        )

    return {
        "artifact_code": artifact_code,
        "project_id": str(project_id),
        "asis_context_used": asis_context,
        "suggestion": result.model_dump(),
    }
