"""Add role_id to raci_comments and CELDA reference type

Revision ID: 20260514_0019
Revises: 20260511_0018
Create Date: 2026-05-14 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260514_0019"
down_revision = "20260511_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("raci_comments", sa.Column("role_id", sa.Uuid(), nullable=True))

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute(
                "ALTER TYPE raci_comment_reference_type_enum ADD VALUE IF NOT EXISTS 'celda'"
            )


def downgrade() -> None:
    op.drop_column("raci_comments", "role_id")
    # PostgreSQL does not support removing enum values; downgrade skips that step
