from __future__ import annotations

from app.ai.llm import get_llm
from app.ai.prompt_store import get_prompt_store
from app.ai.schemas.conceptual import AIConceptualSuggestion
from app.ai.schemas.inventory import AIInventorySuggestion

_DEFAULT_LANG = "No especificado — detecta automáticamente el idioma del contexto"
_NO_EXISTING = "Ninguno generado aún — este es el primer artefacto AS-IS del proyecto."


async def generate_asis_inventory(
    *,
    project_name: str,
    client_name: str,
    context: str,
    existing_asis_context: str = "",
    consultant_note: str = "",
    doc_language: str = _DEFAULT_LANG,
) -> AIInventorySuggestion:
    llm = get_llm()
    structured = llm.with_structured_output(AIInventorySuggestion)
    prompt = get_prompt_store().get_template("asis_inventory")
    chain = prompt | structured
    return await chain.ainvoke({
        "project_name": project_name,
        "client_name": client_name,
        "context": context or "Sin contexto disponible.",
        "existing_asis_context": existing_asis_context or _NO_EXISTING,
        "consultant_note": consultant_note or "Ninguna.",
        "doc_language": doc_language,
    })


async def generate_asis_conceptual(
    *,
    project_name: str,
    client_name: str,
    context: str,
    existing_asis_context: str = "",
    consultant_note: str = "",
    doc_language: str = _DEFAULT_LANG,
) -> AIConceptualSuggestion:
    llm = get_llm()
    structured = llm.with_structured_output(AIConceptualSuggestion)
    prompt = get_prompt_store().get_template("asis_conceptual")
    chain = prompt | structured
    return await chain.ainvoke({
        "project_name": project_name,
        "client_name": client_name,
        "context": context or "Sin contexto disponible.",
        "existing_asis_context": existing_asis_context or _NO_EXISTING,
        "consultant_note": consultant_note or "Ninguna.",
        "doc_language": doc_language,
    })
