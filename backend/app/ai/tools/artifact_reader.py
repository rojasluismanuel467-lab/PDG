from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.conceptual_entity import ConceptualEntity
from app.models.conceptual_model import ConceptualModel
from app.models.conceptual_relation import ConceptualRelation
from app.models.inventory_matrix import InventoryMatrix
from app.models.project_artifact import ProjectArtifact


def _artifact_by_code(db: Session, *, project_id: uuid.UUID, code: str) -> ProjectArtifact | None:
    return db.execute(
        select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.code == code,
        )
    ).scalar_one_or_none()


def read_inventory_as_text(db: Session, *, project_id: uuid.UUID, code: str) -> str | None:
    """Devuelve el inventario como texto legible para el LLM, o None si no existe."""
    artifact = _artifact_by_code(db, project_id=project_id, code=code)
    if artifact is None:
        return None

    matrix = db.execute(
        select(InventoryMatrix).where(
            InventoryMatrix.project_id == project_id,
            InventoryMatrix.artifact_id == artifact.id,
        )
    ).scalar_one_or_none()

    if matrix is None or not matrix.systems:
        return None

    lines = [f"Inventario de Sistemas ({code}):"]
    for s in matrix.systems:
        nombre = s.get("nombre", s.get("id", "Sin nombre"))
        tipo = s.get("tipo", "")
        desc = s.get("descripcion", "")
        estado = s.get("estado", "")
        lines.append(f"  - {nombre} ({tipo}): {desc} [Estado: {estado}]")
    return "\n".join(lines)


def read_conceptual_as_text(db: Session, *, project_id: uuid.UUID, code: str) -> str | None:
    """Devuelve el modelo conceptual como texto legible para el LLM, o None si no existe."""
    artifact = _artifact_by_code(db, project_id=project_id, code=code)
    if artifact is None:
        return None

    model = db.execute(
        select(ConceptualModel)
        .options(
            selectinload(ConceptualModel.entities).selectinload(ConceptualEntity.attributes),
            selectinload(ConceptualModel.relations),
        )
        .where(
            ConceptualModel.project_id == project_id,
            ConceptualModel.artifact_id == artifact.id,
        )
    ).scalar_one_or_none()

    if model is None or not model.entities:
        return None

    lines = [f"Modelo Conceptual ({code}):"]
    lines.append("Entidades:")
    for e in model.entities:
        attrs = ", ".join(a.name for a in e.attributes) if e.attributes else "sin atributos"
        lines.append(f"  - {e.name}: {e.description} [Atributos: {attrs}]")

    if model.relations:
        lines.append("Relaciones:")
        for r in model.relations:
            lines.append(
            f"  - {r.source_entity_client_id} → {r.target_entity_client_id}: {r.description or ''}"
        )

    return "\n".join(lines)


def read_questionnaire_as_text(db: Session, *, project_id: uuid.UUID) -> str | None:
    """Lee las respuestas del cuestionario de madurez AS-IS y retorna un resumen textual."""
    from app.core.enums import MaturityResponseStatus
    from app.models.maturity_answer import MaturityAnswer
    from app.models.maturity_dimension import MaturityDimension
    from app.models.maturity_question import MaturityQuestion
    from app.models.maturity_questionnaire import MaturityQuestionnaire
    from app.models.maturity_response import MaturityResponse

    questionnaire = db.execute(
        select(MaturityQuestionnaire)
        .where(
            MaturityQuestionnaire.project_id == project_id,
            MaturityQuestionnaire.phase == "AS_IS",
        )
        .order_by(MaturityQuestionnaire.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if questionnaire is None:
        return None

    response_count = db.execute(
        select(func.count()).select_from(MaturityResponse).where(
            MaturityResponse.questionnaire_id == questionnaire.id,
            MaturityResponse.status == MaturityResponseStatus.ACTIVE,
        )
    ).scalar_one()

    if response_count == 0:
        return None

    scores = db.execute(
        select(
            MaturityDimension.name,
            func.avg(MaturityAnswer.respondent_score).label("avg_score"),
            func.count(MaturityAnswer.id).label("n"),
        )
        .join(MaturityQuestion, MaturityQuestion.dimension_id == MaturityDimension.id)
        .join(MaturityAnswer, MaturityAnswer.question_id == MaturityQuestion.id)
        .join(MaturityResponse, MaturityResponse.id == MaturityAnswer.response_id)
        .where(
            MaturityResponse.questionnaire_id == questionnaire.id,
            MaturityResponse.status == MaturityResponseStatus.ACTIVE,
        )
        .group_by(MaturityDimension.id, MaturityDimension.name)
        .order_by(MaturityDimension.id)
    ).all()

    comments = db.execute(
        select(MaturityDimension.name, MaturityAnswer.respondent_comments)
        .join(MaturityQuestion, MaturityQuestion.dimension_id == MaturityDimension.id)
        .join(MaturityAnswer, MaturityAnswer.question_id == MaturityQuestion.id)
        .join(MaturityResponse, MaturityResponse.id == MaturityAnswer.response_id)
        .where(
            MaturityResponse.questionnaire_id == questionnaire.id,
            MaturityResponse.status == MaturityResponseStatus.ACTIVE,
            MaturityAnswer.respondent_comments.isnot(None),
            MaturityAnswer.respondent_comments != "",
        )
        .limit(15)
    ).all()

    lines = [
        f"=== Diagnóstico de Madurez de Datos (AS-IS) — {response_count} respondente(s) ===",
        "Escala: 0=Inexistente, 1=Inicial, 2=Básico, 3=Definido, 4=Gestionado, 5=Optimizado",
        "",
        "Puntuaciones por dimensión DAMA-DMBOK:",
    ]
    for row in scores:
        avg = float(row.avg_score) if row.avg_score else 0.0
        nivel = (
            "Inexistente" if avg < 0.5 else
            "Inicial" if avg < 1.5 else
            "Básico" if avg < 2.5 else
            "Definido" if avg < 3.5 else
            "Gestionado" if avg < 4.5 else
            "Optimizado"
        )
        lines.append(f"  - {row.name}: {avg:.1f}/5 ({nivel})")

    if comments:
        lines.append("")
        lines.append("Observaciones de los respondentes:")
        for dim_name, comment in comments:
            lines.append(f"  [{dim_name}] {comment[:250]}")

    return "\n".join(lines)


def collect_asis_context(db: Session, *, project_id: uuid.UUID) -> str:
    """Recopila cuestionario + todos los artefactos AS-IS como texto de contexto para TO-BE."""
    parts: list[str] = []

    questionnaire = read_questionnaire_as_text(db, project_id=project_id)
    if questionnaire:
        parts.append(questionnaire)

    inventory = read_inventory_as_text(
        db, project_id=project_id, code="ASIS_SYSTEM_INVENTORY_MATRIX"
    )
    if inventory:
        parts.append(inventory)

    conceptual = read_conceptual_as_text(
        db, project_id=project_id, code="ASIS_CONCEPTUAL_DIAGRAM"
    )
    if conceptual:
        parts.append(conceptual)

    if not parts:
        return "No hay información AS-IS disponible aún."

    return "\n\n".join(parts)


def collect_tobe_context(db: Session, *, project_id: uuid.UUID) -> str:
    """Recopila los artefactos TO-BE ya generados para mantener coherencia."""
    parts: list[str] = []

    inventory = read_inventory_as_text(
        db, project_id=project_id, code="TOBE_SYSTEM_INVENTORY_MATRIX"
    )
    if inventory:
        parts.append(inventory)

    conceptual = read_conceptual_as_text(
        db, project_id=project_id, code="TOBE_CONCEPTUAL_DIAGRAM"
    )
    if conceptual:
        parts.append(conceptual)

    if not parts:
        return ""

    return "Artefactos TO-BE ya generados (mantener coherencia con estos):\n\n" + "\n\n".join(
        parts
    )
