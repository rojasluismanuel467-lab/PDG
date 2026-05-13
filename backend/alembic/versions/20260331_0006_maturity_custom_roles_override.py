"""Add questionnaire custom role overrides

Revision ID: 20260331_0006
Revises: 20260331_0005
Create Date: 2026-03-31 18:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260331_0006"
down_revision: str | None = "20260331_0005"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "maturity_questionnaires",
        sa.Column(
            "custom_roles_override",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("maturity_questionnaires", "custom_roles_override", server_default=None)


def downgrade() -> None:
    op.drop_column("maturity_questionnaires", "custom_roles_override")
