"""Allow dynamic maturity answer scores beyond 0..5.

Revision ID: 20260501_0014
Revises: 20260422_0013
Create Date: 2026-05-01 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260501_0014"
down_revision: str | None = "20260422_0013"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_maturity_answer_respondent_score", "maturity_answers", type_="check")
    op.drop_constraint("ck_maturity_answer_validated_score", "maturity_answers", type_="check")

    op.create_check_constraint(
        "ck_maturity_answer_respondent_score",
        "maturity_answers",
        sa.text("respondent_score >= 0"),
    )
    op.create_check_constraint(
        "ck_maturity_answer_validated_score",
        "maturity_answers",
        sa.text("(validated_score IS NULL) OR (validated_score >= 0)"),
    )


def downgrade() -> None:
    op.drop_constraint("ck_maturity_answer_respondent_score", "maturity_answers", type_="check")
    op.drop_constraint("ck_maturity_answer_validated_score", "maturity_answers", type_="check")

    op.create_check_constraint(
        "ck_maturity_answer_respondent_score",
        "maturity_answers",
        sa.text("respondent_score >= 0 AND respondent_score <= 5"),
    )
    op.create_check_constraint(
        "ck_maturity_answer_validated_score",
        "maturity_answers",
        sa.text("(validated_score IS NULL) OR (validated_score >= 0 AND validated_score <= 5)"),
    )
