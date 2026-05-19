"""
Phase metadata utilities for the AI knowledge base.

Each artifact belongs to a phase (asis, tobe, brechas, roadmap).
When retrieving context for an artifact, the cascade rule applies:
  - asis    sees: asis + all
  - tobe    sees: asis + tobe + all
  - brechas sees: asis + tobe + brechas + all
  - roadmap sees: everything
"""

from __future__ import annotations

PHASES = ["asis", "tobe", "brechas", "roadmap", "all"]

SOURCE_TYPES = [
    "questionnaire",
    "client_doc",
    "consultant_doc",
    "external_reference",
    "approved_artifact",
    "chat_decision",
    "chat_upload",
]

SCOPES = ["phase_wide", "artifact_specific"]

_ARTIFACT_TO_PHASE: dict[str, str] = {
    "ASIS_CONCEPTUAL_DIAGRAM": "asis",
    "ASIS_SYSTEM_INVENTORY_MATRIX": "asis",
    "TOBE_CONCEPTUAL_DIAGRAM": "tobe",
    "TOBE_SYSTEM_INVENTORY_MATRIX": "tobe",
    # future
    "BRECHAS": "brechas",
    "ROADMAP": "roadmap",
}

_PHASE_CASCADE: dict[str, list[str]] = {
    "asis": ["asis", "all"],
    "tobe": ["asis", "tobe", "all"],
    "brechas": ["asis", "tobe", "brechas", "all"],
    "roadmap": ["asis", "tobe", "brechas", "roadmap", "all"],
    "all": ["all"],
}


def phase_for_artifact(artifact_code: str) -> str:
    """Return the phase name for a given artifact code."""
    return _ARTIFACT_TO_PHASE.get(artifact_code, "all")


def phases_for_artifact(artifact_code: str) -> list[str]:
    """Return the cascaded phase list visible to a given artifact."""
    phase = phase_for_artifact(artifact_code)
    return _PHASE_CASCADE.get(phase, ["all"])
