"""Add version context fields to conceptual comments.

Revision ID: 20260331_0011
Revises: 20260331_0010
Create Date: 2026-03-31 21:05:00
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260331_0011"
down_revision = "20260331_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "conceptual_model_comments",
        sa.Column(
            "created_in_version_number", sa.Integer(), nullable=False, server_default=sa.text("1")
        ),
    )
    op.add_column(
        "conceptual_model_comments",
        sa.Column("outdated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_conceptual_model_comments_outdated_at",
        "conceptual_model_comments",
        ["outdated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_conceptual_model_comments_outdated_at", table_name="conceptual_model_comments"
    )
    op.drop_column("conceptual_model_comments", "outdated_at")
    op.drop_column("conceptual_model_comments", "created_in_version_number")
