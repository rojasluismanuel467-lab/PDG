"""
PromptStore — abstracción sobre el origen de los prompts.

Actualmente lee de app/ai/prompts/_defaults.py (Python module).
Próximo paso: leer de tabla ai_prompts en Postgres con fallback a _defaults.
"""

from __future__ import annotations

from functools import lru_cache

from langchain_core.prompts import ChatPromptTemplate

from app.ai.prompts._defaults import PROMPTS


class PromptStore:
    """Provides ChatPromptTemplate objects by prompt ID.

    The source of truth is PROMPTS in _defaults.py. When a DB-backed
    override is added, this class is the only place that needs to change.
    """

    def get_template(self, prompt_id: str) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for the given prompt ID.

        Raises KeyError if the prompt_id is not found.
        """
        entry = PROMPTS.get(prompt_id)
        if entry is None:
            available = sorted(PROMPTS.keys())
            raise KeyError(
                f"Prompt '{prompt_id}' no encontrado. Disponibles: {available}"
            )
        return ChatPromptTemplate.from_messages([
            ("system", entry["system"]),
            ("human", entry["human"]),
        ])

    def version(self, prompt_id: str) -> str:
        return PROMPTS[prompt_id].get("version", "unknown")


@lru_cache(maxsize=1)
def get_prompt_store() -> PromptStore:
    return PromptStore()
