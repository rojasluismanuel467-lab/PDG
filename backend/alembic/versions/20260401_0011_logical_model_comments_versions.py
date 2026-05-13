"""Add logical data model comments and versions tables.

Revision ID: 20260401_0011
Revises: 20260401_0010
Create Date: 2026-04-01 14:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260401_0011"
down_revision: str | None = "20260401_0010"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "logical_data_model_versions",
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_email", sa.String(length=255), nullable=False),
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
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["model_id"], ["logical_data_models.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", "version_number", name="uq_logical_model_version_number"),
    )
    op.create_index(
        "ix_logical_data_model_versions_model_id",
        "logical_data_model_versions",
        ["model_id"],
    )

    op.create_table(
        "logical_data_model_comments",
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("target_client_id", sa.String(length=120), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_email", sa.String(length=255), nullable=False),
        sa.Column("created_by_user_name", sa.String(length=255), nullable=True),
        sa.Column("created_by_user_type", sa.String(length=32), nullable=False),
        sa.Column("created_in_version_number", sa.Integer(), nullable=False, server_default="1"),
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
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["model_id"], ["logical_data_models.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_logical_data_model_comments_model_id",
        "logical_data_model_comments",
        ["model_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_logical_data_model_comments_model_id", table_name="logical_data_model_comments"
    )
    op.drop_table("logical_data_model_comments")
    op.drop_index(
        "ix_logical_data_model_versions_model_id", table_name="logical_data_model_versions"
    )
    op.drop_table("logical_data_model_versions")
