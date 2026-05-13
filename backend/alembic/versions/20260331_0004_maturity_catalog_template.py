"""Align maturity catalog with DAMA questionnaire template.

Revision ID: 20260331_0004
Revises: 20260331_0003
Create Date: 2026-03-31 10:30:00
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.core.maturity_questionnaire_catalog import (
    DAMA_DIMENSION_CATALOG,
    DAMA_SUBDOMAIN_CATALOG,
    QUESTION_TEMPLATE_CATALOG,
)

revision = "20260331_0004"
down_revision = "20260331_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    bind.execute(sa.text("DELETE FROM maturity_answers"))
    bind.execute(sa.text("DELETE FROM maturity_responses"))
    bind.execute(sa.text("DELETE FROM maturity_questions"))

    bind.execute(sa.text("DELETE FROM maturity_subdomains"))
    bind.execute(sa.text("DELETE FROM maturity_dimensions"))

    dimension_table = sa.table(
        "maturity_dimensions",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("weight", sa.Numeric()),
        sa.column("display_order", sa.Integer()),
    )
    subdomain_table = sa.table(
        "maturity_subdomains",
        sa.column("id", sa.Integer()),
        sa.column("dimension_id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("weight", sa.Numeric()),
        sa.column("display_order", sa.Integer()),
    )
    question_table = sa.table(
        "maturity_questions",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("questionnaire_id", postgresql.UUID(as_uuid=True)),
        sa.column("dimension_id", sa.Integer()),
        sa.column("subdomain_id", sa.Integer()),
        sa.column("text", sa.Text()),
        sa.column("applicable_roles", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("weight", sa.Numeric()),
        sa.column("is_active", sa.Boolean()),
    )

    op.bulk_insert(dimension_table, DAMA_DIMENSION_CATALOG)
    op.bulk_insert(subdomain_table, DAMA_SUBDOMAIN_CATALOG)

    questionnaire_ids = [
        row[0] for row in bind.execute(sa.text("SELECT id FROM maturity_questionnaires")).fetchall()
    ]
    if questionnaire_ids:
        question_rows = []
        for questionnaire_id in questionnaire_ids:
            for template in QUESTION_TEMPLATE_CATALOG:
                question_rows.append(
                    {
                        "id": uuid.uuid4(),
                        "questionnaire_id": questionnaire_id,
                        "dimension_id": template["dimension_id"],
                        "subdomain_id": template["subdomain_id"],
                        "text": template["text"],
                        "applicable_roles": template["applicable_roles"],
                        "weight": template["weight"],
                        "is_active": True,
                    }
                )
        op.bulk_insert(question_table, question_rows)


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM maturity_answers"))
    bind.execute(sa.text("DELETE FROM maturity_responses"))
    bind.execute(sa.text("DELETE FROM maturity_questions"))
    bind.execute(sa.text("DELETE FROM maturity_subdomains"))
    bind.execute(sa.text("DELETE FROM maturity_dimensions"))
