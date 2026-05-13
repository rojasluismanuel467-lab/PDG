from __future__ import annotations

from dataclasses import dataclass

from app.core.enums import ProjectBlock


@dataclass(frozen=True)
class ArtifactDefinition:
    code: str
    name: str
    description: str
    block: ProjectBlock
    block_order: int
    order_index: int


ARTIFACT_CATALOG: tuple[ArtifactDefinition, ...] = (
    ArtifactDefinition(
        code="ASIS_MATURITY_QUESTIONNAIRE",
        name="Maturity Questionnaire",
        description="Assessment of the organization's data management maturity level, including evidence-based validation.",
        block=ProjectBlock.AS_IS,
        block_order=1,
        order_index=1,
    ),
    ArtifactDefinition(
        code="ASIS_CONCEPTUAL_DIAGRAM",
        name="AS-IS Conceptual Diagram",
        description="High-level visual model of the current business entities and their relationships.",
        block=ProjectBlock.AS_IS,
        block_order=2,
        order_index=2,
    ),
    ArtifactDefinition(
        code="ASIS_SYSTEM_INVENTORY_MATRIX",
        name="System Inventory Matrix",
        description="Catalog of applications, databases, and platforms with their key characteristics.",
        block=ProjectBlock.AS_IS,
        block_order=3,
        order_index=3,
    ),
    ArtifactDefinition(
        code="ASIS_DFD",
        name="AS-IS DFD",
        description="Current-state data flow diagram showing how information moves across systems, processes, and actors.",
        block=ProjectBlock.AS_IS,
        block_order=4,
        order_index=4,
    ),
    ArtifactDefinition(
        code="ASIS_RACI_MATRIX",
        name="RACI / Roles Matrix",
        description="Definition of responsibilities over data using a RACI structure.",
        block=ProjectBlock.AS_IS,
        block_order=5,
        order_index=5,
    ),
    ArtifactDefinition(
        code="TOBE_CONCEPTUAL_DIAGRAM",
        name="TO-BE Conceptual Diagram",
        description="Target-state high-level model of future business entities and relationships.",
        block=ProjectBlock.TO_BE,
        block_order=1,
        order_index=6,
    ),
    ArtifactDefinition(
        code="TOBE_LOGICAL_DATA_MODEL",
        name="TO-BE Logical Data Model",
        description="Detailed structure of entities, attributes, data types, and relationships for the target state.",
        block=ProjectBlock.TO_BE,
        block_order=2,
        order_index=7,
    ),
    ArtifactDefinition(
        code="TOBE_BUSINESS_GLOSSARY",
        name="Business Glossary",
        description="Standardized definitions of key business terms, entities, and attributes.",
        block=ProjectBlock.TO_BE,
        block_order=3,
        order_index=8,
    ),
    ArtifactDefinition(
        code="TOBE_DFD",
        name="TO-BE DFD",
        description="Future-state integration architecture and optimized data flows across target systems.",
        block=ProjectBlock.TO_BE,
        block_order=4,
        order_index=9,
    ),
    ArtifactDefinition(
        code="GAPS_CRUD_MATRIX",
        name="Comparative CRUD Matrix",
        description="Cross-reference between AS-IS and TO-BE indicating create, read, update, and delete gaps by entity or system.",
        block=ProjectBlock.BRECHAS,
        block_order=1,
        order_index=10,
    ),
    ArtifactDefinition(
        code="GAPS_ANALYSIS_REPORT",
        name="Gap Analysis Report",
        description="Narrative analysis detailing deficiencies, risks, impacts, and priorities.",
        block=ProjectBlock.BRECHAS,
        block_order=2,
        order_index=11,
    ),
    ArtifactDefinition(
        code="GAPS_INTEGRATION_QUALITY_RULES",
        name="Integration and Quality Rules",
        description="Technical specifications required to close gaps, including transformation and validation rules.",
        block=ProjectBlock.BRECHAS,
        block_order=3,
        order_index=12,
    ),
    ArtifactDefinition(
        code="ROADMAP_IMPLEMENTATION_PLAN",
        name="Implementation Roadmap",
        description="Sequenced initiative roadmap for closing gaps, including milestones and dependencies.",
        block=ProjectBlock.ROADMAP,
        block_order=1,
        order_index=13,
    ),
    ArtifactDefinition(
        code="ROADMAP_ARCHITECTURE_STANDARDS",
        name="Architecture Standards",
        description="Policies, guidelines, and conventions to be followed during implementation.",
        block=ProjectBlock.ROADMAP,
        block_order=2,
        order_index=14,
    ),
    ArtifactDefinition(
        code="ROADMAP_METRICS_DASHBOARD",
        name="Metrics and KPIs Dashboard",
        description="Success indicators and monitoring metrics for the data architecture implementation.",
        block=ProjectBlock.ROADMAP,
        block_order=3,
        order_index=15,
    ),
    ArtifactDefinition(
        code="ASIS_LOGICAL_DATA_MODEL",
        name="AS-IS Logical Data Model",
        description="Detailed structure of entities, attributes, data types, and relationships for the current state.",
        block=ProjectBlock.AS_IS,
        block_order=6,
        order_index=16,
    ),
)

ARTIFACT_BY_CODE: dict[str, ArtifactDefinition] = {
    artifact.code: artifact for artifact in ARTIFACT_CATALOG
}
