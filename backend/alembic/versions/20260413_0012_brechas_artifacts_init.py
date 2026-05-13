"""Add Brechas artifacts storage and version tables.

Revision ID: 20260413_0012
Revises: 20260401_0011
Create Date: 2026-04-13 20:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260413_0012"
down_revision: str | None = "20260401_0011"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "gaps_crud_matrices",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("comparisons", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("current_version_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "last_saved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
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
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artifact_id"], ["project_artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "artifact_id", name="uq_gaps_crud_matrix_project_artifact"
        ),
    )

    op.create_table(
        "gaps_crud_matrix_versions",
        sa.Column("matrix_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(["matrix_id"], ["gaps_crud_matrices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "matrix_id", "version_number", name="uq_gaps_crud_matrix_version_number"
        ),
    )

    op.create_table(
        "gap_analysis_reports",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("executive_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("gaps", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("total_gaps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("critical_gaps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "priority_recommendations", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("target_formats", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("current_version_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "last_saved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
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
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artifact_id"], ["project_artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "artifact_id", name="uq_gap_analysis_report_project_artifact"
        ),
    )

    op.create_table(
        "gap_analysis_report_versions",
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(["report_id"], ["gap_analysis_reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "report_id", "version_number", name="uq_gap_analysis_report_version_number"
        ),
    )

    op.create_table(
        "integration_quality_rules",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("technical_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("rules", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("acceptance_criteria", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("target_formats", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("current_version_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "last_saved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
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
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artifact_id"], ["project_artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "artifact_id", name="uq_integration_quality_rules_project_artifact"
        ),
    )

    op.create_table(
        "integration_quality_rules_versions",
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["document_id"], ["integration_quality_rules.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id", "version_number", name="uq_integration_quality_rules_version_number"
        ),
    )


def downgrade() -> None:
    op.drop_table("integration_quality_rules_versions")
    op.drop_table("integration_quality_rules")
    op.drop_table("gap_analysis_report_versions")
    op.drop_table("gap_analysis_reports")
    op.drop_table("gaps_crud_matrix_versions")
    op.drop_table("gaps_crud_matrices")
