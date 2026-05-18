from __future__ import annotations

from app.ai.llm import get_llm
from app.ai.prompt_store import get_prompt_store
from app.ai.schemas.conceptual import AIConceptualSuggestion
from app.ai.schemas.inventory import AIInventorySuggestion


async def generate_tobe_inventory(
    *,
    project_name: str,
    client_name: str,
    asis_context: str,
    tobe_context: str = "",
    consultant_note: str = "",
) -> AIInventorySuggestion:
    llm = get_llm()
    structured = llm.with_structured_output(AIInventorySuggestion)
    prompt = get_prompt_store().get_template("tobe_inventory")
    chain = prompt | structured
    return await chain.ainvoke({
        "project_name": project_name,
        "client_name": client_name,
        "asis_context": asis_context or "Sin artefactos AS-IS disponibles.",
        "tobe_context": tobe_context or "Ninguno generado aún.",
        "consultant_note": consultant_note or "Ninguna — aplica criterios DAMA-DMBOK estándar.",
    })


async def generate_tobe_conceptual(
    *,
    project_name: str,
    client_name: str,
    asis_context: str,
    tobe_context: str = "",
    consultant_note: str = "",
) -> AIConceptualSuggestion:
    llm = get_llm()
    structured = llm.with_structured_output(AIConceptualSuggestion)
    prompt = get_prompt_store().get_template("tobe_conceptual")
    chain = prompt | structured
    return await chain.ainvoke({
        "project_name": project_name,
        "client_name": client_name,
        "asis_context": asis_context or "Sin artefactos AS-IS disponibles.",
        "tobe_context": tobe_context or "Ninguno generado aún.",
        "consultant_note": consultant_note or "Ninguna — aplica criterios DAMA-DMBOK estándar.",
    })
