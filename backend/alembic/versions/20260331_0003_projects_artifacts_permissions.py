"""Add project metadata, artifacts, and hierarchical permissions.

Revision ID: 20260331_0003
Revises: 20260331_0002
Create Date: 2026-03-31 01:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260331_0003"
down_revision = "20260331_0002"
branch_labels = None
depends_on = None


ARTIFACT_ROWS = [
    (
        "ASIS_MATURITY_QUESTIONNAIRE",
        "Maturity Questionnaire",
        "Assessment of the organization's data management maturity level, including evidence-based validation.",
        "AS_IS",
        1,
        1,
    ),
    (
        "ASIS_CONCEPTUAL_DIAGRAM",
        "AS-IS Conceptual Diagram",
        "High-level visual model of the current business entities and their relationships.",
        "AS_IS",
        2,
        2,
    ),
    (
        "ASIS_SYSTEM_INVENTORY_MATRIX",
        "System Inventory Matrix",
        "Catalog of applications, databases, and platforms with their key characteristics.",
        "AS_IS",
        3,
        3,
    ),
    (
        "ASIS_DFD",
        "AS-IS DFD",
        "Current-state data flow diagram showing how information moves across systems, processes, and actors.",
        "AS_IS",
        4,
        4,
    ),
    (
        "ASIS_RACI_MATRIX",
        "RACI / Roles Matrix",
        "Definition of responsibilities over data using a RACI structure.",
        "AS_IS",
        5,
        5,
    ),
    (
        "TOBE_CONCEPTUAL_DIAGRAM",
        "TO-BE Conceptual Diagram",
        "Target-state high-level model of future business entities and relationships.",
        "TO_BE",
        1,
        6,
    ),
    (
        "TOBE_LOGICAL_DATA_MODEL",
        "TO-BE Logical Data Model",
        "Detailed structure of entities, attributes, data types, and relationships for the target state.",
        "TO_BE",
        2,
        7,
    ),
    (
        "TOBE_BUSINESS_GLOSSARY",
        "Business Glossary",
        "Standardized definitions of key business terms, entities, and attributes.",
        "TO_BE",
        3,
        8,
    ),
    (
        "TOBE_DFD",
        "TO-BE DFD",
        "Future-state integration architecture and optimized data flows across target systems.",
        "TO_BE",
        4,
        9,
    ),
    (
        "GAPS_CRUD_MATRIX",
        "Comparative CRUD Matrix",
        "Cross-reference between AS-IS and TO-BE indicating create, read, update, and delete gaps by entity or system.",
        "BRECHAS",
        1,
        10,
    ),
    (
        "GAPS_ANALYSIS_REPORT",
        "Gap Analysis Report",
        "Narrative analysis detailing deficiencies, risks, impacts, and priorities.",
        "BRECHAS",
        2,
        11,
    ),
    (
        "GAPS_INTEGRATION_QUALITY_RULES",
        "Integration and Quality Rules",
        "Technical specifications required to close gaps, including transformation and validation rules.",
        "BRECHAS",
        3,
        12,
    ),
    (
        "ROADMAP_IMPLEMENTATION_PLAN",
        "Implementation Roadmap",
        "Sequenced initiative roadmap for closing gaps, including milestones and dependencies.",
        "ROADMAP",
        1,
        13,
    ),
    (
        "ROADMAP_ARCHITECTURE_STANDARDS",
        "Architecture Standards",
        "Policies, guidelines, and conventions to be followed during implementation.",
        "ROADMAP",
        2,
        14,
    ),
    (
        "ROADMAP_METRICS_DASHBOARD",
        "Metrics and KPIs Dashboard",
        "Success indicators and monitoring metrics for the data architecture implementation.",
        "ROADMAP",
        3,
        15,
    ),
]


def upgrade() -> None:
    bind = op.get_bind()

    op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    enums_to_create = [
        ("project_artifact_block_enum", ["PROJECT", "AS_IS", "TO_BE", "BRECHAS", "ROADMAP"]),
        (
            "project_artifact_status_enum",
            ["PENDING", "IN_PROGRESS", "PENDING_COMPANY_APPROVAL", "APPROVED", "NOT_APPLICABLE"],
        ),
    ]
    for enum_name, labels in enums_to_create:
        res = bind.execute(
            sa.text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'")
        ).fetchone()
        if not res:
            labels_str = ", ".join([f"'{label}'" for label in labels])
            op.execute(sa.text(f"CREATE TYPE {enum_name} AS ENUM ({labels_str})"))

    op.add_column(
        "projects", sa.Column("client_company_name", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "projects", sa.Column("client_company_email", sa.String(length=255), nullable=True)
    )
    op.add_column("projects", sa.Column("estimated_end_date", sa.Date(), nullable=True))
    op.execute(
        sa.text(
            "UPDATE projects SET client_company_name = nombre || ' Client' WHERE client_company_name IS NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE projects SET client_company_email = 'client+' || substring(id::text, 1, 8) || '@example.com' WHERE client_company_email IS NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE projects SET estimated_end_date = CURRENT_DATE + INTERVAL '90 days' WHERE estimated_end_date IS NULL"
        )
    )
    op.alter_column("projects", "client_company_name", nullable=False)
    op.alter_column("projects", "client_company_email", nullable=False)
    op.alter_column("projects", "estimated_end_date", nullable=False)

    op.drop_constraint("ck_membership_nivel_asis_0_5", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_nivel_tobe_0_5", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_nivel_brechas_0_5", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_manager_levels", "project_memberships", type_="check")
    op.alter_column(
        "project_memberships",
        "nivel_asis",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
    op.alter_column(
        "project_memberships",
        "nivel_tobe",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
    op.alter_column(
        "project_memberships",
        "nivel_brechas",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
    op.add_column(
        "project_memberships", sa.Column("project_permission_level", sa.Integer(), nullable=True)
    )
    op.add_column("project_memberships", sa.Column("nivel_roadmap", sa.Integer(), nullable=True))
    op.execute(
        sa.text(
            "UPDATE project_memberships SET project_permission_level = CASE WHEN is_manager THEN 5 ELSE NULL END"
        )
    )
    op.execute(
        sa.text(
            "UPDATE project_memberships SET nivel_roadmap = CASE WHEN is_manager THEN 5 ELSE NULL END"
        )
    )
    op.create_check_constraint(
        "ck_membership_project_permission_level_0_5",
        "project_memberships",
        "project_permission_level IS NULL OR (project_permission_level >= 0 AND project_permission_level <= 5)",
    )
    op.create_check_constraint(
        "ck_membership_nivel_asis_0_5",
        "project_memberships",
        "nivel_asis IS NULL OR (nivel_asis >= 0 AND nivel_asis <= 5)",
    )
    op.create_check_constraint(
        "ck_membership_nivel_tobe_0_5",
        "project_memberships",
        "nivel_tobe IS NULL OR (nivel_tobe >= 0 AND nivel_tobe <= 5)",
    )
    op.create_check_constraint(
        "ck_membership_nivel_brechas_0_5",
        "project_memberships",
        "nivel_brechas IS NULL OR (nivel_brechas >= 0 AND nivel_brechas <= 5)",
    )
    op.create_check_constraint(
        "ck_membership_nivel_roadmap_0_5",
        "project_memberships",
        "nivel_roadmap IS NULL OR (nivel_roadmap >= 0 AND nivel_roadmap <= 5)",
    )
    op.create_check_constraint(
        "ck_membership_manager_levels",
        "project_memberships",
        "(NOT is_manager) OR (project_permission_level = 5 AND nivel_asis = 5 AND nivel_tobe = 5 AND nivel_brechas = 5 AND nivel_roadmap = 5)",
    )

    op.create_table(
        "project_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "block",
            postgresql.ENUM(
                "PROJECT",
                "AS_IS",
                "TO_BE",
                "BRECHAS",
                "ROADMAP",
                name="project_artifact_block_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("block_order", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDING",
                "IN_PROGRESS",
                "PENDING_COMPANY_APPROVAL",
                "APPROVED",
                "NOT_APPLICABLE",
                name="project_artifact_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'PENDING'::project_artifact_status_enum"),
        ),
        sa.Column("is_applicable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "consultant_approved", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "company_approved", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("consultant_approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("company_approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("review_cycles", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_rejection_reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "code", name="uq_project_artifact_project_code"),
    )
    op.create_index(
        "ix_project_artifacts_project_id", "project_artifacts", ["project_id"], unique=False
    )
    op.create_index("ix_project_artifacts_block", "project_artifacts", ["block"], unique=False)

    op.create_table(
        "project_artifact_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_level", sa.Integer(), nullable=False),
        sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "permission_level >= 0 AND permission_level <= 5",
            name="ck_artifact_permission_level_0_5",
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artifact_id"], ["project_artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "artifact_id", "user_id", name="uq_project_artifact_permission_artifact_user"
        ),
    )
    op.create_index(
        "ix_project_artifact_permissions_project_id",
        "project_artifact_permissions",
        ["project_id"],
        unique=False,
    )

    for code, name, description, block, block_order, order_index in ARTIFACT_ROWS:
        bind.execute(
            sa.text(
                """
                INSERT INTO project_artifacts (
                    id, project_id, code, name, description, block, order_index, block_order,
                    status, is_applicable, consultant_approved, company_approved, review_cycles,
                    created_at, updated_at
                )
                SELECT
                    gen_random_uuid(), p.id, :code, :name, :description, :block, :order_index, :block_order,
                    'PENDING'::project_artifact_status_enum, true, false, false, 0, now(), now()
                FROM projects p
                ON CONFLICT (project_id, code) DO NOTHING
                """
            ),
            {
                "code": code,
                "name": name,
                "description": description,
                "block": block,
                "order_index": order_index,
                "block_order": block_order,
            },
        )


def downgrade() -> None:
    op.drop_index(
        "ix_project_artifact_permissions_project_id", table_name="project_artifact_permissions"
    )
    op.drop_table("project_artifact_permissions")

    op.drop_index("ix_project_artifacts_block", table_name="project_artifacts")
    op.drop_index("ix_project_artifacts_project_id", table_name="project_artifacts")
    op.drop_table("project_artifacts")

    op.drop_constraint("ck_membership_manager_levels", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_nivel_roadmap_0_5", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_nivel_brechas_0_5", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_nivel_tobe_0_5", "project_memberships", type_="check")
    op.drop_constraint("ck_membership_nivel_asis_0_5", "project_memberships", type_="check")
    op.drop_constraint(
        "ck_membership_project_permission_level_0_5", "project_memberships", type_="check"
    )
    op.drop_column("project_memberships", "nivel_roadmap")
    op.drop_column("project_memberships", "project_permission_level")
    op.alter_column(
        "project_memberships",
        "nivel_brechas",
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text("0"),
    )
    op.alter_column(
        "project_memberships",
        "nivel_tobe",
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text("0"),
    )
    op.alter_column(
        "project_memberships",
        "nivel_asis",
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text("0"),
    )
    op.create_check_constraint(
        "ck_membership_nivel_asis_0_5", "project_memberships", "nivel_asis >= 0 AND nivel_asis <= 5"
    )
    op.create_check_constraint(
        "ck_membership_nivel_tobe_0_5", "project_memberships", "nivel_tobe >= 0 AND nivel_tobe <= 5"
    )
    op.create_check_constraint(
        "ck_membership_nivel_brechas_0_5",
        "project_memberships",
        "nivel_brechas >= 0 AND nivel_brechas <= 5",
    )
    op.create_check_constraint(
        "ck_membership_manager_levels",
        "project_memberships",
        "(NOT is_manager) OR (nivel_asis = 5 AND nivel_tobe = 5 AND nivel_brechas = 5)",
    )

    op.drop_column("projects", "estimated_end_date")
    op.drop_column("projects", "client_company_email")
    op.drop_column("projects", "client_company_name")

    bind = op.get_bind()
    op.execute(sa.text("DROP TYPE IF EXISTS project_artifact_status_enum"))
    op.execute(sa.text("DROP TYPE IF EXISTS project_artifact_block_enum"))
