"""
Central artifact registry.

Declaring a new artifact requires:
  1. A Pydantic output schema in app/ai/schemas/
  2. A prompt entry in app/ai/prompts/_defaults.py
  3. A generate_* async function in app/ai/chains/
  4. A node function + _NODE_MAP entry in app/ai/graph/artifact_graph.py
  5. An entry here in ARTIFACT_REGISTRY

Everything else — supported-code validation, label lookup, graph routing,
and file-upload phase resolution — derives from this single source of truth.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ArtifactConfig:
    code: str        # Artifact code used in API paths and DB
    label: str       # Human-readable Spanish label for prompts / UI
    phase: str       # asis | tobe | brechas | roadmap
    graph_node: str  # LangGraph node name in artifact_graph.py


ARTIFACT_REGISTRY: dict[str, ArtifactConfig] = {
    "ASIS_CONCEPTUAL_DIAGRAM": ArtifactConfig(
        code="ASIS_CONCEPTUAL_DIAGRAM",
        label="Diagrama Conceptual AS-IS",
        phase="asis",
        graph_node="generate_asis_conceptual",
    ),
    "ASIS_SYSTEM_INVENTORY_MATRIX": ArtifactConfig(
        code="ASIS_SYSTEM_INVENTORY_MATRIX",
        label="Inventario de Sistemas AS-IS",
        phase="asis",
        graph_node="generate_asis_inventory",
    ),
    "TOBE_CONCEPTUAL_DIAGRAM": ArtifactConfig(
        code="TOBE_CONCEPTUAL_DIAGRAM",
        label="Diagrama Conceptual TO-BE",
        phase="tobe",
        graph_node="generate_tobe_conceptual",
    ),
    "TOBE_SYSTEM_INVENTORY_MATRIX": ArtifactConfig(
        code="TOBE_SYSTEM_INVENTORY_MATRIX",
        label="Inventario de Sistemas TO-BE",
        phase="tobe",
        graph_node="generate_tobe_inventory",
    ),
}
