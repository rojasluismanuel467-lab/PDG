from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import DocumentStatus
from app.models.project_document import ProjectDocument

_ALLOWED_MIME = {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.RAG_CHUNK_SIZE,
    chunk_overlap=settings.RAG_CHUNK_OVERLAP,
)


def _extract_text(path: Path, mime_type: str) -> str:
    if mime_type == "application/pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)
    # plain text / CSV
    return path.read_text(errors="replace")


def save_upload(
    db: Session,
    *,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    file: UploadFile,
) -> ProjectDocument:
    mime = file.content_type or "application/octet-stream"
    if mime not in _ALLOWED_MIME:
        from app.exceptions.domain import ValidationDomainError
        raise ValidationDomainError(
            f"Tipo de archivo no permitido: {mime}. "
            f"Permitidos: PDF, TXT, CSV, XLS, XLSX."
        )

    upload_dir = Path(settings.MEDIA_ROOT) / "documents" / str(project_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4()}_{file.filename}"
    dest = upload_dir / stored_name
    content = file.file.read()
    dest.write_bytes(content)

    doc = ProjectDocument(
        project_id=project_id,
        uploaded_by_user_id=user_id,
        original_name=file.filename or stored_name,
        stored_path=str(dest),
        mime_type=mime,
        size_bytes=len(content),
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def vectorize_document(db: Session, document_id: uuid.UUID) -> None:
    """Extract text, split into chunks, embed, and store in the vector store.

    Runs in a background thread — creates its own DB session state.
    """
    from app.ai.tools.document_retriever import add_chunks

    doc = db.get(ProjectDocument, document_id)
    if doc is None:
        return

    doc.status = DocumentStatus.PROCESSING
    db.commit()

    try:
        text = _extract_text(Path(doc.stored_path), doc.mime_type)
        chunks = _splitter.split_text(text)
        if not chunks:
            raise ValueError("El documento no contiene texto extraíble.")

        count = add_chunks(
            project_id=doc.project_id,
            document_id=doc.id,
            filename=doc.original_name,
            chunks=chunks,
        )
        doc.status = DocumentStatus.READY
        doc.chunk_count = count
        doc.error_message = None
    except Exception as exc:
        doc.status = DocumentStatus.ERROR
        doc.error_message = str(exc)[:1000]

    db.commit()


def list_documents(db: Session, project_id: uuid.UUID) -> list[ProjectDocument]:
    return list(
        db.execute(
            select(ProjectDocument)
            .where(ProjectDocument.project_id == project_id)
            .order_by(ProjectDocument.created_at.desc())
        ).scalars()
    )


def delete_document(db: Session, document_id: uuid.UUID, project_id: uuid.UUID) -> None:
    from app.ai.tools.document_retriever import delete_document_chunks
    from app.exceptions.domain import NotFoundDomainError

    doc = db.execute(
        select(ProjectDocument).where(
            ProjectDocument.id == document_id,
            ProjectDocument.project_id == project_id,
        )
    ).scalar_one_or_none()

    if doc is None:
        raise NotFoundDomainError("Documento no encontrado.")

    try:
        delete_document_chunks(document_id)
    except Exception:
        pass  # best effort — remove DB record even if vector store deletion fails

    path = Path(doc.stored_path)
    if path.exists():
        path.unlink(missing_ok=True)

    db.delete(doc)
    db.commit()
