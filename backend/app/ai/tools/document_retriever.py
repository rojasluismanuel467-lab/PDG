"""
RAG retriever: queries the pgvector store for a given project
and returns the most relevant chunks as a single text block.
"""

from __future__ import annotations

import uuid
from functools import lru_cache

from langchain_postgres import PGVector

from app.ai.embeddings import get_embeddings
from app.core.config import settings

_COLLECTION = "project_documents"


@lru_cache(maxsize=1)
def _get_store() -> PGVector:
    from app.core.database import get_active_db_url
    return PGVector(
        embeddings=get_embeddings(),
        collection_name=_COLLECTION,
        connection=get_active_db_url(),
        use_jsonb=True,
    )


def retrieve_context(project_id: uuid.UUID, query: str) -> str:
    """Return the top-K most relevant chunks for *query* within the project."""
    docs = _get_store().similarity_search(
        query,
        k=settings.RAG_TOP_K,
        filter={"project_id": str(project_id)},
    )
    if not docs:
        return ""
    parts = [f"[{i + 1}] {d.page_content}" for i, d in enumerate(docs)]
    return "\n\n".join(parts)


def add_chunks(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    filename: str,
    chunks: list[str],
) -> int:
    """Embed and store *chunks* in the vector store. Returns number of chunks stored."""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content=chunk,
            metadata={
                "project_id": str(project_id),
                "document_id": str(document_id),
                "filename": filename,
                "chunk_index": i,
            },
        )
        for i, chunk in enumerate(chunks)
    ]
    _get_store().add_documents(docs)
    return len(docs)


def delete_document_chunks(document_id: uuid.UUID) -> None:
    """Remove all chunks for a document from the vector store."""
    _get_store().delete(filter={"document_id": str(document_id)})
