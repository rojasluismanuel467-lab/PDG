from __future__ import annotations

from collections.abc import AsyncGenerator

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.ai.llm import get_llm
from app.ai.phase_context import PhaseContext, summarize_artifact  # noqa: F401 — re-exported
from app.ai.registry import ARTIFACT_REGISTRY

# Marker the LLM appends when it intends to modify the artifact.
SUGGEST_MARKER = "<SUGGEST_UPDATE/>"

_ARTIFACT_LABELS = {code: cfg.label for code, cfg in ARTIFACT_REGISTRY.items()}


def build_system_prompt(
    artifact_code: str,
    artifact_summary: str,
    project_name: str,
    client_name: str,
    cross_artifact_context: str = "",
) -> str:
    label = _ARTIFACT_LABELS.get(artifact_code, artifact_code)
    cross_section = (
        f"\nOTROS ARTEFACTOS DEL PROYECTO (para mantener coherencia):\n{cross_artifact_context}\n"
        if cross_artifact_context else ""
    )
    return (
        f"Eres un asistente experto en Arquitectura de Datos (DAMA-DMBOK) ayudando a un consultor "
        f"en el proyecto '{project_name}' para '{client_name}'.\n\n"
        f"Artefacto en edición: {label}\n"
        f"Estado actual:\n{artifact_summary}\n"
        f"{cross_section}\n"
        "REGLAS ESTRICTAS:\n"
        "1. Responde SIEMPRE en máximo 2-3 oraciones breves. Nunca generes listas largas.\n"
        "2. NO detalles entidades, atributos ni sistemas en texto — el sistema visual ya lo muestra.\n"
        "3. Cuando vayas a modificar o generar el artefacto, describe en una oración qué harás "
        f"y luego añade exactamente '{SUGGEST_MARKER}' al final (nada más después).\n"
        "4. Si solo respondes una pregunta sin cambiar el artefacto, NO añadas el marcador.\n\n"
        "HUMAN-IN-THE-LOOP (cuando sea necesario):\n"
        "- Si para cumplir la solicitud necesitas INFERIR o ASUMIR algo importante que no está explícito "
        "en el contexto (especialmente relaciones/cardenalidades), primero haz UNA pregunta breve de "
        "confirmación o aclaración y NO añadas el marcador.\n"
        "- Si el consultor confirma (p. ej. 'sí, infiere'), en el siguiente turno ya puedes proponer "
        "el cambio con el marcador para que el consultor lo revise con Aceptar/Descartar. Si ya lo "
        "confirmó previamente en este hilo, no lo vuelvas a preguntar.\n"
        "- Si el consultor da feedback de rechazo (p. ej. 'descarté porque...'), reconoce el feedback, "
        "ajusta tu criterio y NO regeneres automáticamente a menos que el consultor lo pida.\n\n"
        "CUÁNDO añadir el marcador: solo cuando el consultor pide generar, crear, añadir, "
        "modificar, eliminar o cambiar algo del artefacto.\n"
        "CUÁNDO NO añadir el marcador: preguntas informativas, explicaciones, confirmaciones, "
        "análisis o cualquier respuesta que no cambie el artefacto.\n\n"
        "Ejemplos CON marcador:\n"
        "  'Voy a generar el modelo completo con las entidades principales de retail. "
        "<SUGGEST_UPDATE/>'\n"
        "  'Añadiré la entidad Proveedor y la relacionaré con Producto. <SUGGEST_UPDATE/>'\n\n"
        "Ejemplos SIN marcador:\n"
        "  '¿Cuántas entidades tiene?' → 'El modelo actual tiene 5 entidades.'\n"
        "  '¿Qué es un AS-IS?' → 'Es una representación del estado actual de la arquitectura.'\n\n"
        "Responde siempre en español."
    )


async def stream_chat(
    *,
    history_messages: list[BaseMessage],
    user_message: str,
    artifact_code: str,
    project_name: str,
    client_name: str,
    phase_context: PhaseContext,
) -> AsyncGenerator[dict, None]:
    """
    Streams the chat response as SSE events.

    Yields dicts with 'type': 'token' | 'generating_artifact' | 'artifact' | 'done' | 'error'
    """
    llm = get_llm()
    system_prompt = build_system_prompt(
        artifact_code,
        phase_context.artifact_summary,
        project_name,
        client_name,
        phase_context.as_cross_artifact_context(),
    )

    messages: list[BaseMessage] = (
        [SystemMessage(content=system_prompt)]
        + history_messages
        + [HumanMessage(content=user_message)]
    )

    # Rolling buffer so that a marker split across multiple tokens is always detected.
    # We hold back up to (marker_len - 1) chars before flushing, which guarantees
    # that a complete marker always appears inside `pending` before we flush past it.
    marker_len = len(SUGGEST_MARKER)
    pending = ""
    sent: list[str] = []
    marker_found = False

    try:
        async for chunk in llm.astream(messages):
            token = chunk.content or ""
            if not token:
                continue

            pending += token

            if SUGGEST_MARKER in pending:
                before = pending[: pending.index(SUGGEST_MARKER)]
                if before:
                    sent.append(before)
                    yield {"type": "token", "content": before}
                marker_found = True
                pending = ""
                break

            safe = max(0, len(pending) - (marker_len - 1))
            if safe > 0:
                chunk_out = pending[:safe]
                pending = pending[safe:]
                sent.append(chunk_out)
                yield {"type": "token", "content": chunk_out}

    except Exception as exc:
        yield {"type": "error", "content": str(exc)}
        return

    if pending and not marker_found:
        sent.append(pending)
        yield {"type": "token", "content": pending}

    raw_response = "".join(sent)

    if marker_found:
        yield {"type": "generating_artifact"}
        try:
            artifact = await _generate_structured_artifact(
                artifact_code=artifact_code,
                conversation_history=history_messages + [
                    HumanMessage(content=user_message),
                    AIMessage(content=raw_response),
                ],
                project_name=project_name,
                client_name=client_name,
                phase_context=phase_context,
            )
            if artifact:
                yield {"type": "artifact", "data": artifact}
        except Exception as exc:
            yield {"type": "error", "content": f"Error generando artefacto: {exc}"}

    yield {"type": "done", "content": raw_response}


async def _generate_structured_artifact(
    *,
    artifact_code: str,
    conversation_history: list[BaseMessage],
    project_name: str,
    client_name: str,
    phase_context: PhaseContext,
) -> dict | None:
    """Routes artifact generation through the LangGraph artifact graph."""
    from app.ai.graph.artifact_graph import run_artifact_graph

    context_parts = []
    last_user_msg = ""
    for msg in conversation_history[-8:]:
        prefix = "Consultor" if isinstance(msg, HumanMessage) else "IA"
        context_parts.append(f"{prefix}: {msg.content}")
        if isinstance(msg, HumanMessage):
            last_user_msg = msg.content
    conversation_text = "\n".join(context_parts)

    context = phase_context.as_generation_context(conversation_text)

    existing_summary = phase_context.artifact_summary
    if existing_summary and existing_summary != "(artefacto vacío — aún no tiene contenido)":
        context += f"\n\nContenido actual del artefacto:\n{existing_summary}"

    consultant_note = (
        f"Instrucción del consultor: {last_user_msg}\n\n"
        "REGLAS DE MODIFICACIÓN:\n"
        "- Si la instrucción pide ELIMINAR TODO el diagrama/inventario, retorna listas vacías [].\n"
        "- Si pide eliminar elementos específicos, excluye solo esos del resultado.\n"
        "- Si pide añadir elementos, incorpóralos al modelo actual manteniendo el resto.\n"
        "- Si pide modificar elementos, aplica los cambios preservando lo que no se menciona.\n"
        "- El modelo resultante representa el ESTADO COMPLETO después de aplicar la instrucción.\n"
        "- Mantén coherencia con los otros artefactos del proyecto listados en el contexto."
    ) if last_user_msg else "Genera el artefacto basándote en la conversación con el consultor."

    return await run_artifact_graph(
        artifact_code=artifact_code,
        context=context,
        project_name=project_name,
        client_name=client_name,
        existing_summary=existing_summary,
        consultant_note=consultant_note,
    )
