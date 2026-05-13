"""Add respondent comments to maturity answers.

Revision ID: 20260501_0015
Revises: 20260501_0014
Create Date: 2026-05-01 19:05:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260501_0015"
down_revision: str | None = "20260501_0014"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "maturity_answers",
        sa.Column("respondent_comments", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("maturity_answers", "respondent_comments")
