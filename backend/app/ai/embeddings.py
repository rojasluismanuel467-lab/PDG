"""
Embedding model factory.

Provider detection (EMBEDDING_PROVIDER or falls back to LLM_PROVIDER):
  - huggingface → HuggingFaceEmbeddings (local, sin API key, gratis)
                  Modelo por defecto: sentence-transformers/all-mpnet-base-v2 (768 dims)
  - openai      → OpenAIEmbeddings (text-embedding-3-small, 1536 dims)
  - google      → GoogleGenerativeAIEmbeddings (models/text-embedding-004, 768 dims)
  - anthropic / groq → sin API de embeddings; usa EMBEDDING_PROVIDER=huggingface
"""

from __future__ import annotations

from functools import lru_cache

from langchain_core.embeddings import Embeddings

from app.core.config import settings


@lru_cache(maxsize=1)
def get_embeddings() -> Embeddings:
    provider = (settings.EMBEDDING_PROVIDER or settings.LLM_PROVIDER).lower()
    api_key = settings.EMBEDDING_API_KEY or settings.LLM_API_KEY

    if provider in ("huggingface", "hf", "groq", "anthropic"):
        # Groq y Anthropic no tienen embeddings API — usamos HuggingFace local (sin clave)
        from langchain_huggingface import HuggingFaceEmbeddings

        model = (
            settings.EMBEDDING_MODEL
            if settings.EMBEDDING_MODEL not in ("text-embedding-3-small", "models/text-embedding-004", "")
            else "sentence-transformers/all-mpnet-base-v2"
        )
        return HuggingFaceEmbeddings(model_name=model)

    if provider in ("google", "gemini"):
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        model = settings.EMBEDDING_MODEL if settings.EMBEDDING_MODEL != "text-embedding-3-small" \
            else "models/text-embedding-004"
        return GoogleGenerativeAIEmbeddings(model=model, google_api_key=api_key)

    # OpenAI (default)
    from langchain_openai import OpenAIEmbeddings

    if not api_key:
        raise RuntimeError(
            "Configura LLM_API_KEY (OpenAI) o EMBEDDING_API_KEY en .env para habilitar el RAG."
        )
    model = settings.EMBEDDING_MODEL if settings.EMBEDDING_MODEL != "models/text-embedding-004" \
        else "text-embedding-3-small"
    return OpenAIEmbeddings(model=model, api_key=api_key)
