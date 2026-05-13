"""Add questionnaire dimension weight overrides

Revision ID: 20260331_0005
Revises: 20260331_0004
Create Date: 2026-03-31 16:35:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260331_0005"
down_revision: str | None = "20260331_0004"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "maturity_questionnaires",
        sa.Column(
            "dimension_weights_override",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.alter_column("maturity_questionnaires", "dimension_weights_override", server_default=None)


def downgrade() -> None:
    op.drop_column("maturity_questionnaires", "dimension_weights_override")
