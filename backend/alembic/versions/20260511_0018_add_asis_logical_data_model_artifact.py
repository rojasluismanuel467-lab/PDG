"""Add AS-IS logical data model artifact to existing projects.

Revision ID: 20260511_0018
Revises: 20260503_0017
Create Date: 2026-05-11 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260511_0018"
down_revision: str | None = "20260503_0017"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO project_artifacts (
                id, project_id, code, name, description, block, order_index, block_order,
                status, is_applicable, consultant_approved, company_approved, review_cycles,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(), p.id, :code, :name, :description, :block, :order_index, :block_order,
                'PENDING'::project_artifact_status_enum, true, false, false, 0, now(), now()
            FROM projects p
            ON CONFLICT (project_id, code) DO NOTHING
            """
        ),
        {
            "code": "ASIS_LOGICAL_DATA_MODEL",
            "name": "AS-IS Logical Data Model",
            "description": (
                "Detailed structure of entities, attributes, data types, and relationships for the current state."
            ),
            "block": "AS_IS",
            "order_index": 16,
            "block_order": 6,
        },
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM project_artifacts WHERE code = 'ASIS_LOGICAL_DATA_MODEL'")
    )

