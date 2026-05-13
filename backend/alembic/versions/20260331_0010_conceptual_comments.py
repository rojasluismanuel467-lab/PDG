"""Add conceptual model comments table.

Revision ID: 20260331_0010
Revises: 20260331_0009
Create Date: 2026-03-31 20:05:00
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260331_0010"
down_revision = "20260331_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conceptual_model_comments",
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
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("target_client_id", sa.String(length=120), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'open'")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_email", sa.String(length=255), nullable=False),
        sa.Column("created_by_user_name", sa.String(length=255), nullable=False),
        sa.Column(
            "created_by_user_type",
            postgresql.ENUM(
                "ADMINISTRADOR",
                "CONSULTOR",
                "EMPRESA",
                name="user_type_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.CheckConstraint(
            "target_type IN ('entity', 'relation', 'general')",
            name="ck_conceptual_model_comments_target_type",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'resolved')",
            name="ck_conceptual_model_comments_status",
        ),
        sa.ForeignKeyConstraint(["model_id"], ["conceptual_models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_conceptual_model_comments_model_id",
        "conceptual_model_comments",
        ["model_id"],
        unique=False,
    )
    op.create_index(
        "ix_conceptual_model_comments_model_target",
        "conceptual_model_comments",
        ["model_id", "target_type", "target_client_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_conceptual_model_comments_model_target", table_name="conceptual_model_comments"
    )
    op.drop_index("ix_conceptual_model_comments_model_id", table_name="conceptual_model_comments")
    op.drop_table("conceptual_model_comments")
