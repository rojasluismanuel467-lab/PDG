from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import is_postgres
from app.core.enums import PermissionLevel
from app.dependencies.auth import CurrentUser, require_admin_or_consultant
from app.dependencies.db import get_db
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.models.project_document import ProjectDocument
from app.services.document_service import (
    delete_document,
    list_documents,
    save_upload,
    vectorize_document,
)
from app.services.project_permission_service import ProjectPermissionService

router = APIRouter(prefix="/projects", tags=["AI Documents"])


def _check_rag_available() -> None:
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI layer deshabilitado en esta instancia.")
    if not is_postgres():
        raise HTTPException(
            status_code=503,
            detail="La carga de documentos requiere PostgreSQL. "
                   "Esta instancia usa SQLite (modo demo).",
        )


def _check_project_access(
    db: Session, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Raise 403 if the user is not a member of the project with at least LECTURA."""
    try:
        ProjectPermissionService.resolve_project_level(
            db,
            project_id=project_id,
            actor_user_id=user_id,
            minimum_level=PermissionLevel.LECTURA,
        )
    except ForbiddenDomainError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


def _doc_response(doc: ProjectDocument) -> dict:
    return {
        "id": str(doc.id),
        "project_id": str(doc.project_id),
        "original_name": doc.original_name,
        "mime_type": doc.mime_type,
        "size_bytes": doc.size_bytes,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message,
        "created_at": doc.created_at.isoformat(),
    }


@router.post("/{project_id}/ai/documents", status_code=202)
async def upload_document(
    project_id: uuid.UUID,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_consultant),
):
    """
    Upload a PDF, TXT, or CSV file to be vectorized and used as RAG context.

    The file is stored immediately; vectorization happens in the background.
    Poll GET /documents to check when status == READY.
    """
    _check_rag_available()
    _check_project_access(db, project_id=project_id, user_id=current_user.id)

    try:
        doc = save_upload(
            db,
            project_id=project_id,
            user_id=current_user.id,
            file=file,
        )
    except ValidationDomainError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    background_tasks.add_task(vectorize_document, db, doc.id)

    return _doc_response(doc)


@router.get("/{project_id}/ai/documents")
def list_project_documents(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_consultant),
):
    _check_rag_available()
    _check_project_access(db, project_id=project_id, user_id=current_user.id)
    docs = list_documents(db, project_id)
    return [_doc_response(d) for d in docs]


@router.delete("/{project_id}/ai/documents/{document_id}", status_code=204)
def delete_project_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_consultant),
):
    _check_rag_available()
    _check_project_access(db, project_id=project_id, user_id=current_user.id)
    try:
        delete_document(db, document_id, project_id)
    except NotFoundDomainError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
