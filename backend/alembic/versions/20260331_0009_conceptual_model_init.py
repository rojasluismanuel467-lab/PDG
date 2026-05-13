"""Create conceptual model tables.

Revision ID: 20260331_0009
Revises: 20260331_0008
Create Date: 2026-03-31 15:10:00
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260331_0009"
down_revision = "20260331_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conceptual_models",
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
        sa.Column(
            "phase",
            sa.Enum(
                "PROJECT",
                "AS_IS",
                "TO_BE",
                "BRECHAS",
                "ROADMAP",
                name="conceptual_model_phase_enum",
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("current_version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_saved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("phase IN ('AS_IS', 'TO_BE')", name="ck_conceptual_models_phase"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artifact_id"], ["project_artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("artifact_id", name="uq_conceptual_models_artifact_id"),
    )
    op.create_index(
        "ix_conceptual_models_project_id", "conceptual_models", ["project_id"], unique=False
    )

    op.create_table(
        "conceptual_entities",
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
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("position_x", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("position_y", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["model_id"], ["conceptual_models.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", "client_id", name="uq_conceptual_entities_model_client_id"),
    )
    op.create_index(
        "ix_conceptual_entities_model_id", "conceptual_entities", ["model_id"], unique=False
    )

    op.create_table(
        "conceptual_attributes",
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
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("data_type", sa.String(length=50), nullable=False),
        sa.Column("is_pk", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_fk", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_nullable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("fk_entity_client_id", sa.String(length=120), nullable=True),
        sa.Column("fk_attribute_ref", sa.String(length=255), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["entity_id"], ["conceptual_entities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "entity_id", "client_id", name="uq_conceptual_attributes_entity_client_id"
        ),
    )
    op.create_index(
        "ix_conceptual_attributes_entity_id", "conceptual_attributes", ["entity_id"], unique=False
    )

    op.create_table(
        "conceptual_relations",
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
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("source_entity_client_id", sa.String(length=120), nullable=False),
        sa.Column("target_entity_client_id", sa.String(length=120), nullable=False),
        sa.Column("cardinality", sa.String(length=10), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("fk_attribute_client_id", sa.String(length=120), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["model_id"], ["conceptual_models.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "model_id", "client_id", name="uq_conceptual_relations_model_client_id"
        ),
    )
    op.create_index(
        "ix_conceptual_relations_model_id", "conceptual_relations", ["model_id"], unique=False
    )

    op.create_table(
        "conceptual_model_versions",
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
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column(
            "snapshot_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_email", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["model_id"], ["conceptual_models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "model_id", "version_number", name="uq_conceptual_model_versions_model_version"
        ),
    )
    op.create_index(
        "ix_conceptual_model_versions_model_id",
        "conceptual_model_versions",
        ["model_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_conceptual_model_versions_model_id", table_name="conceptual_model_versions")
    op.drop_table("conceptual_model_versions")

    op.drop_index("ix_conceptual_relations_model_id", table_name="conceptual_relations")
    op.drop_table("conceptual_relations")

    op.drop_index("ix_conceptual_attributes_entity_id", table_name="conceptual_attributes")
    op.drop_table("conceptual_attributes")

    op.drop_index("ix_conceptual_entities_model_id", table_name="conceptual_entities")
    op.drop_table("conceptual_entities")

    op.drop_index("ix_conceptual_models_project_id", table_name="conceptual_models")
    op.drop_table("conceptual_models")

    op.execute(sa.text("DROP TYPE IF EXISTS conceptual_model_phase_enum"))
