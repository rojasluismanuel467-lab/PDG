from __future__ import annotations

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.ai.chat.chain import stream_chat
from app.ai.chat.history import DBArtifactChatHistory, maybe_compact
from app.ai.llm import get_llm
from app.ai.phase_context import build_phase_context
from app.ai.registry import ARTIFACT_REGISTRY
from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.exceptions.domain import ValidationDomainError
from app.models.artifact_chat import ArtifactChatMessage, ArtifactChatSession
from app.models.project import Project

router = APIRouter(prefix="/projects", tags=["AI Chat"])

_SUPPORTED = frozenset(ARTIFACT_REGISTRY.keys())


class ChatMessageRequest(BaseModel):
    message: str
    current_artifact: dict = {}


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    suggested_artifact: dict | None
    created_at: datetime


class ChatSessionCreateRequest(BaseModel):
    title: str | None = None


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    last_message_at: datetime | None
    message_count: int


def _get_or_create_session(
    db: Session,
    *,
    project_id: uuid.UUID,
    artifact_code: str,
    user_id: uuid.UUID,
) -> ArtifactChatSession:
    session = db.execute(
        select(ArtifactChatSession)
        .where(
            ArtifactChatSession.project_id == project_id,
            ArtifactChatSession.artifact_code == artifact_code,
            ArtifactChatSession.user_id == user_id,
        )
        .order_by(
            ArtifactChatSession.last_message_at.desc().nullslast(),
            ArtifactChatSession.created_at.desc(),
        )
        .limit(1)
    ).scalar_one_or_none()

    if session is None:
        session = ArtifactChatSession(
            project_id=project_id,
            artifact_code=artifact_code,
            user_id=user_id,
            title="Nuevo chat",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    return session


def _get_session_or_404(
    db: Session,
    *,
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ArtifactChatSession:
    session = db.execute(
        select(ArtifactChatSession).where(
            ArtifactChatSession.id == session_id,
            ArtifactChatSession.project_id == project_id,
            ArtifactChatSession.artifact_code == artifact_code,
            ArtifactChatSession.user_id == user_id,
        )
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(404, "Sesión de chat no encontrada.")
    return session


_ARTIFACT_LABELS = {code: cfg.label for code, cfg in ARTIFACT_REGISTRY.items()}


class CoherenceCheckRequest(BaseModel):
    artifact_json: dict = {}


@router.post("/{project_id}/ai/artifacts/{artifact_code}/coherence-check")
async def check_coherence(
    project_id: uuid.UUID,
    artifact_code: str,
    body: CoherenceCheckRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analiza la coherencia del artefacto dado contra sus artefactos hermanos del proyecto.
    Retorna una lista de incoherencias detectadas por la IA.
    """
    if artifact_code not in _SUPPORTED:
        raise HTTPException(400, f"artifact_code '{artifact_code}' no soportado.")

    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(404, "Proyecto no encontrado.")

    ctx = await build_phase_context(
        db=db,
        project_id=project_id,
        artifact_code=artifact_code,
        current_artifact_json=body.artifact_json,
        query=artifact_code,
    )
    cross_context = ctx.as_cross_artifact_context()
    if not cross_context:
        return {
            "issues": [],
            "overall": "consistent",
            "summary": "No hay artefactos hermanos con contenido para comparar.",
        }

    from app.ai.chains.coherence import check_artifact_coherence

    artifact_label = _ARTIFACT_LABELS.get(artifact_code, artifact_code)

    report = await check_artifact_coherence(
        project_name=project.nombre,
        client_name=project.client_company_name,
        artifact_label=artifact_label,
        artifact_summary=ctx.artifact_summary,
        cross_artifact_context=cross_context,
    )
    return report.model_dump()


@router.get("/{project_id}/ai/chat/{artifact_code}/sessions")
def list_chat_sessions(
    project_id: uuid.UUID,
    artifact_code: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Lista las sesiones de chat del usuario para un artefacto (historial tipo ChatGPT)."""
    stmt = (
        select(
            ArtifactChatSession.id,
            ArtifactChatSession.title,
            ArtifactChatSession.created_at,
            ArtifactChatSession.last_message_at,
            func.count(ArtifactChatMessage.id).label("message_count"),
        )
        .outerjoin(
            ArtifactChatMessage,
            ArtifactChatMessage.session_id == ArtifactChatSession.id,
        )
        .where(
            ArtifactChatSession.project_id == project_id,
            ArtifactChatSession.artifact_code == artifact_code,
            ArtifactChatSession.user_id == current_user.id,
        )
        .group_by(
            ArtifactChatSession.id,
            ArtifactChatSession.title,
            ArtifactChatSession.created_at,
            ArtifactChatSession.last_message_at,
        )
        .order_by(
            ArtifactChatSession.last_message_at.desc().nullslast(),
            ArtifactChatSession.created_at.desc(),
        )
    )
    rows = db.execute(stmt).all()
    sessions = [
        ChatSessionResponse(
            id=str(r.id),
            title=r.title,
            created_at=r.created_at,
            last_message_at=r.last_message_at,
            message_count=int(r.message_count or 0),
        ).model_dump()
        for r in rows
    ]
    return {"sessions": sessions}


@router.post("/{project_id}/ai/chat/{artifact_code}/sessions")
def create_chat_session(
    project_id: uuid.UUID,
    artifact_code: str,
    body: ChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Crea una nueva sesión de chat (nuevo hilo) para este artefacto."""
    if artifact_code not in _SUPPORTED:
        raise HTTPException(400, f"artifact_code '{artifact_code}' no soportado.")

    session = ArtifactChatSession(
        project_id=project_id,
        artifact_code=artifact_code,
        user_id=current_user.id,
        title=(body.title or "Nuevo chat").strip()[:140] or "Nuevo chat",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionResponse(
        id=str(session.id),
        title=session.title,
        created_at=session.created_at,
        last_message_at=session.last_message_at,
        message_count=0,
    ).model_dump()


@router.patch("/{project_id}/ai/chat/{artifact_code}/sessions/{session_id}")
def rename_chat_session(
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    body: ChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Renombra una sesión de chat."""
    session = _get_session_or_404(
        db,
        project_id=project_id,
        artifact_code=artifact_code,
        session_id=session_id,
        user_id=current_user.id,
    )
    title = (body.title or "").strip()
    if not title:
        raise HTTPException(400, "El título no puede estar vacío.")
    session.title = title[:140]
    db.commit()
    db.refresh(session)
    return {"ok": True, "id": str(session.id), "title": session.title}


@router.delete("/{project_id}/ai/chat/{artifact_code}/sessions/{session_id}")
def delete_chat_session(
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Elimina una sesión de chat y sus mensajes."""
    session = _get_session_or_404(
        db,
        project_id=project_id,
        artifact_code=artifact_code,
        session_id=session_id,
        user_id=current_user.id,
    )
    db.execute(
        delete(ArtifactChatSession).where(ArtifactChatSession.id == session.id)
    )
    db.commit()
    return {"ok": True}


@router.get("/{project_id}/ai/chat/{artifact_code}/sessions/{session_id}/history")
def get_chat_history_for_session(
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Devuelve el historial de mensajes de una sesión específica."""
    session = _get_session_or_404(
        db,
        project_id=project_id,
        artifact_code=artifact_code,
        session_id=session_id,
        user_id=current_user.id,
    )
    messages = [
        ChatMessageResponse(
            id=str(msg.id),
            session_id=str(session.id),
            role=msg.role,
            content=msg.content,
            suggested_artifact=msg.suggested_artifact,
            created_at=msg.created_at,
        )
        for msg in session.messages
        if msg.role != "system"  # ocultar mensajes de compactación
    ]
    return {"session_id": str(session.id), "messages": [m.model_dump() for m in messages]}


@router.delete("/{project_id}/ai/chat/{artifact_code}/sessions/{session_id}/history")
def clear_chat_history_for_session(
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Borra el historial de mensajes de una sesión, manteniendo la sesión."""
    session = _get_session_or_404(
        db,
        project_id=project_id,
        artifact_code=artifact_code,
        session_id=session_id,
        user_id=current_user.id,
    )
    history = DBArtifactChatHistory(db, session.id)
    history.clear()
    return {"ok": True}


@router.post(
    "/{project_id}/ai/chat/{artifact_code}/sessions/{session_id}/upload",
    status_code=202,
)
async def upload_chat_document(
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Sube un documento en el contexto de una sesión de chat.

    El archivo queda vectorizado como phase_wide en la fase del artefacto
    (source_type=chat_upload). Disponible para RAG en el mismo turno de chat
    siguiente, una vez que el worker termina la vectorización.
    """
    if artifact_code not in _SUPPORTED:
        raise HTTPException(400, f"artifact_code '{artifact_code}' no soportado.")

    _get_session_or_404(
        db,
        project_id=project_id,
        artifact_code=artifact_code,
        session_id=session_id,
        user_id=current_user.id,
    )

    from app.core.config import settings
    from app.core.database import is_postgres
    if not settings.AI_ENABLED:
        raise HTTPException(503, "AI layer deshabilitado en esta instancia.")
    if not is_postgres():
        raise HTTPException(
            503,
            "La carga de documentos requiere PostgreSQL. "
            "Esta instancia usa SQLite (modo demo).",
        )

    from app.ai.phases import phase_for_artifact
    from app.core.arq import get_arq_pool
    from app.services.document_service import save_upload
    from app.services.document_service import vectorize_document as _vectorize

    phase = phase_for_artifact(artifact_code)
    try:
        doc = save_upload(
            db,
            project_id=project_id,
            user_id=current_user.id,
            file=file,
            phase=phase,
            scope="phase_wide",
            source_type="chat_upload",
            artifact_code=None,
        )
    except ValidationDomainError as exc:
        raise HTTPException(422, str(exc))

    pool = await get_arq_pool()
    if pool is not None:
        await pool.enqueue_job("vectorize_document", str(doc.id))
    else:
        background_tasks.add_task(_vectorize, db, doc.id)

    return {
        "id": str(doc.id),
        "original_name": doc.original_name,
        "mime_type": doc.mime_type,
        "size_bytes": doc.size_bytes,
        "status": doc.status,
        "phase": doc.phase,
    }


@router.post("/{project_id}/ai/chat/{artifact_code}/sessions/{session_id}/message")
async def chat_message_for_session(
    project_id: uuid.UUID,
    artifact_code: str,
    session_id: uuid.UUID,
    body: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Igual que /message, pero apunta a una sesión específica (hilo) del chat."""
    if artifact_code not in _SUPPORTED:
        raise HTTPException(400, f"artifact_code '{artifact_code}' no soportado.")

    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(404, "Proyecto no encontrado.")

    session = _get_session_or_404(
        db,
        project_id=project_id,
        artifact_code=artifact_code,
        session_id=session_id,
        user_id=current_user.id,
    )
    history = DBArtifactChatHistory(db, session.id)

    llm = get_llm()
    await maybe_compact(history, session, llm)

    ctx = await build_phase_context(
        db=db,
        project_id=project_id,
        artifact_code=artifact_code,
        current_artifact_json=body.current_artifact,
        query=body.message,
    )

    from langchain_core.messages import HumanMessage
    history.add_messages([HumanMessage(content=body.message)])
    history_msgs = history.messages[:-1]

    async def event_stream():
        full_response_parts: list[str] = []
        artifact_data: dict | None = None

        try:
            async for event in stream_chat(
                history_messages=history_msgs,
                user_message=body.message,
                artifact_code=artifact_code,
                project_name=project.nombre,
                client_name=project.client_company_name,
                phase_context=ctx,
            ):
                if event["type"] == "token":
                    full_response_parts.append(event["content"])
                elif event["type"] == "artifact":
                    artifact_data = event["data"]
                elif event["type"] == "done":
                    full_text = event.get("content") or "".join(full_response_parts)
                    from langchain_core.messages import AIMessage
                    history.add_messages([AIMessage(content=full_text)])
                    if artifact_data:
                        history.save_artifact_to_last_assistant_message(artifact_data)

                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )

@router.post("/{project_id}/ai/chat/{artifact_code}/message")
async def chat_message(
    project_id: uuid.UUID,
    artifact_code: str,
    body: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Envía un mensaje al chat del artefacto. Responde en SSE (text/event-stream).

    Eventos SSE:
      data: {"type": "token",               "content": "..."}
      data: {"type": "generating_artifact"}
      data: {"type": "artifact",            "data":    {...}}
      data: {"type": "done",                "content": "<full text>"}
      data: {"type": "error",               "content": "..."}
    """
    if artifact_code not in _SUPPORTED:
        raise HTTPException(400, f"artifact_code '{artifact_code}' no soportado.")

    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(404, "Proyecto no encontrado.")

    session = _get_or_create_session(
        db, project_id=project_id, artifact_code=artifact_code, user_id=current_user.id
    )
    history = DBArtifactChatHistory(db, session.id)

    # Compactar si es necesario
    llm = get_llm()
    await maybe_compact(history, session, llm)

    ctx = await build_phase_context(
        db=db,
        project_id=project_id,
        artifact_code=artifact_code,
        current_artifact_json=body.current_artifact,
        query=body.message,
    )

    # Guardar mensaje del usuario
    from langchain_core.messages import HumanMessage
    history.add_messages([HumanMessage(content=body.message)])
    history_msgs = history.messages[:-1]  # sin el que acabamos de agregar

    async def event_stream():
        full_response_parts: list[str] = []
        artifact_data: dict | None = None

        try:
            async for event in stream_chat(
                history_messages=history_msgs,
                user_message=body.message,
                artifact_code=artifact_code,
                project_name=project.nombre,
                client_name=project.client_company_name,
                phase_context=ctx,
            ):
                if event["type"] == "token":
                    full_response_parts.append(event["content"])
                elif event["type"] == "artifact":
                    artifact_data = event["data"]
                elif event["type"] == "done":
                    # Guardar mensaje del asistente en DB
                    full_text = event.get("content") or "".join(full_response_parts)
                    from langchain_core.messages import AIMessage
                    history.add_messages([AIMessage(content=full_text)])
                    if artifact_data:
                        history.save_artifact_to_last_assistant_message(artifact_data)

                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/{project_id}/ai/chat/{artifact_code}/history")
def get_chat_history(
    project_id: uuid.UUID,
    artifact_code: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Devuelve el historial de mensajes de la sesión del usuario para este artefacto."""
    session = db.execute(
        select(ArtifactChatSession).where(
            ArtifactChatSession.project_id == project_id,
            ArtifactChatSession.artifact_code == artifact_code,
            ArtifactChatSession.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if session is None:
        return {"session_id": None, "messages": []}

    messages = [
        ChatMessageResponse(
            id=str(msg.id),
            session_id=str(session.id),
            role=msg.role,
            content=msg.content,
            suggested_artifact=msg.suggested_artifact,
            created_at=msg.created_at,
        )
        for msg in session.messages
        if msg.role != "system"  # ocultar mensajes de compactación
    ]

    return {"session_id": str(session.id), "messages": [m.model_dump() for m in messages]}


@router.delete("/{project_id}/ai/chat/{artifact_code}/history")
def clear_chat_history(
    project_id: uuid.UUID,
    artifact_code: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Borra el historial del chat para este artefacto."""
    session = db.execute(
        select(ArtifactChatSession).where(
            ArtifactChatSession.project_id == project_id,
            ArtifactChatSession.artifact_code == artifact_code,
            ArtifactChatSession.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if session:
        history = DBArtifactChatHistory(db, session.id)
        history.clear()

    return {"ok": True}
