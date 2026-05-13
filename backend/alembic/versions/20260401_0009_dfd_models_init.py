"""Create DFD AS-IS persistence tables.

Revision ID: 20260401_0009
Revises: 20260331_0008
Create Date: 2026-04-01 12:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260401_0009"
down_revision = "20260331_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dfd_models",
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
        sa.Column("phase", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "nodes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "flows",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "current_version_number", sa.Integer(), nullable=False, server_default=sa.text("1")
        ),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "last_saved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artifact_id"], ["project_artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "artifact_id", name="uq_dfd_model_project_artifact"),
    )
    op.create_index(
        "ix_dfd_models_project_artifact", "dfd_models", ["project_id", "artifact_id"], unique=False
    )

    op.create_table(
        "dfd_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_email", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["model_id"], ["dfd_models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", "version_number", name="uq_dfd_version_model_number"),
    )
    op.create_index("ix_dfd_versions_model", "dfd_versions", ["model_id"], unique=False)

    op.create_table(
        "dfd_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("target_client_id", sa.String(length=120), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'open'")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_email", sa.String(length=255), nullable=False),
        sa.Column("created_by_user_name", sa.String(length=255), nullable=True),
        sa.Column("created_by_user_type", sa.String(length=30), nullable=False),
        sa.Column("created_in_version_number", sa.Integer(), nullable=False),
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
        sa.CheckConstraint(
            "target_type IN ('nodo', 'flujo', 'general')", name="ck_dfd_comment_target_type"
        ),
        sa.CheckConstraint("status IN ('open', 'resolved')", name="ck_dfd_comment_status"),
        sa.ForeignKeyConstraint(["model_id"], ["dfd_models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dfd_comments_model", "dfd_comments", ["model_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_dfd_comments_model", table_name="dfd_comments")
    op.drop_table("dfd_comments")

    op.drop_index("ix_dfd_versions_model", table_name="dfd_versions")
    op.drop_table("dfd_versions")

    op.drop_index("ix_dfd_models_project_artifact", table_name="dfd_models")
    op.drop_table("dfd_models")
