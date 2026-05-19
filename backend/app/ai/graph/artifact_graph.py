"""
LangGraph routing graph for artifact generation.

Replaces the if/elif block in chain._generate_structured_artifact with a
proper StateGraph. Each artifact type maps to a dedicated node; adding a
new artifact only requires a new node + a new edge — chain.py stays unchanged.

Graph topology (all nodes connect to END):

    START → [router] → generate_asis_conceptual  ─┐
                      → generate_tobe_conceptual  ─┤→ END
                      → generate_asis_inventory   ─┤
                      → generate_tobe_inventory   ─┘
"""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.ai.registry import ARTIFACT_REGISTRY


class ArtifactState(TypedDict):
    artifact_code: str
    context: str           # full generation context (docs + conversation + cross-artifact)
    project_name: str
    client_name: str
    existing_summary: str  # current artifact state text
    consultant_note: str
    result: dict | None    # populated by the generation node
    last_error: str        # populated on failure, cleared on success


# ── Generation nodes ──────────────────────────────────────────────────────────

async def _node_asis_conceptual(state: ArtifactState) -> ArtifactState:
    from app.ai.chains.asis import generate_asis_conceptual
    result = await generate_asis_conceptual(
        project_name=state["project_name"],
        client_name=state["client_name"],
        context=state["context"],
        existing_asis_context=state["existing_summary"],
        consultant_note=state["consultant_note"],
        doc_language="español",
    )
    return {"result": result.model_dump(), "last_error": ""}


async def _node_tobe_conceptual(state: ArtifactState) -> ArtifactState:
    from app.ai.chains.tobe import generate_tobe_conceptual
    result = await generate_tobe_conceptual(
        project_name=state["project_name"],
        client_name=state["client_name"],
        asis_context=state["context"],
        tobe_context=state["existing_summary"],
        consultant_note=state["consultant_note"],
    )
    return {"result": result.model_dump(), "last_error": ""}


async def _node_asis_inventory(state: ArtifactState) -> ArtifactState:
    from app.ai.chains.asis import generate_asis_inventory
    result = await generate_asis_inventory(
        project_name=state["project_name"],
        client_name=state["client_name"],
        context=state["context"],
        existing_asis_context=state["existing_summary"],
        consultant_note=state["consultant_note"],
        doc_language="español",
    )
    return {"result": result.model_dump(), "last_error": ""}


async def _node_tobe_inventory(state: ArtifactState) -> ArtifactState:
    from app.ai.chains.tobe import generate_tobe_inventory
    result = await generate_tobe_inventory(
        project_name=state["project_name"],
        client_name=state["client_name"],
        asis_context=state["context"],
        tobe_context=state["existing_summary"],
        consultant_note=state["consultant_note"],
    )
    return {"result": result.model_dump(), "last_error": ""}


# ── Router ────────────────────────────────────────────────────────────────────

# Derived from ARTIFACT_REGISTRY — add new artifacts there, then add a node
# function above and an entry in _NODE_MAP below.
_ROUTES: dict[str, str] = {
    cfg.code: cfg.graph_node for cfg in ARTIFACT_REGISTRY.values()
}

# Maps LangGraph node names to their async node functions.
_NODE_MAP: dict[str, Any] = {
    "generate_asis_conceptual": _node_asis_conceptual,
    "generate_tobe_conceptual": _node_tobe_conceptual,
    "generate_asis_inventory": _node_asis_inventory,
    "generate_tobe_inventory": _node_tobe_inventory,
}


def _route(state: ArtifactState) -> str:
    node = _ROUTES.get(state["artifact_code"])
    if node is None:
        raise ValueError(f"artifact_code '{state['artifact_code']}' no tiene nodo en el grafo.")
    return node


# ── Graph construction ────────────────────────────────────────────────────────

def _build() -> object:
    builder: StateGraph = StateGraph(ArtifactState)

    for node_name, node_fn in _NODE_MAP.items():
        builder.add_node(node_name, node_fn)

    builder.add_conditional_edges(START, _route, _ROUTES)

    for node in _ROUTES.values():
        builder.add_edge(node, END)

    return builder.compile()


_graph = _build()


# ── Public API ────────────────────────────────────────────────────────────────

async def run_artifact_graph(
    *,
    artifact_code: str,
    context: str,
    project_name: str,
    client_name: str,
    existing_summary: str,
    consultant_note: str,
) -> dict | None:
    """
    Runs the artifact generation graph and returns the result dict.

    Returns None if artifact_code is not recognized.
    Raises on generation failure (LangChain structured-output errors propagate up).
    """
    if artifact_code not in _ROUTES:
        return None

    state: ArtifactState = {
        "artifact_code": artifact_code,
        "context": context,
        "project_name": project_name,
        "client_name": client_name,
        "existing_summary": existing_summary,
        "consultant_note": consultant_note,
        "result": None,
        "last_error": "",
    }
    final = await _graph.ainvoke(state)
    return final.get("result")
