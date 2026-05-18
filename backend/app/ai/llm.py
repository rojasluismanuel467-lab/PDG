from __future__ import annotations

from functools import lru_cache

from langchain_core.language_models import BaseChatModel

from app.core.config import settings


@lru_cache(maxsize=1)
def get_llm() -> BaseChatModel:
    """Factory agnóstico al proveedor. Cambia LLM_PROVIDER + LLM_MODEL en .env para swappear."""
    provider = settings.LLM_PROVIDER.lower()

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=settings.LLM_MODEL,
            api_key=settings.LLM_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=settings.LLM_MODEL,
            api_key=settings.LLM_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )

    if provider in ("google", "gemini"):
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.LLM_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )

    if provider == "groq":
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.LLM_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )

    raise ValueError(
        f"LLM_PROVIDER '{provider}' no soportado. Usa 'openai', 'anthropic', 'google' o 'groq'."
    )
