from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class GapAnalysisReport(TimestampedUUIDModel):
    __tablename__ = "gap_analysis_reports"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "artifact_id", name="uq_gap_analysis_report_project_artifact"
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("project_artifacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    gaps: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    total_gaps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    critical_gaps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority_recommendations: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    target_formats: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    current_version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    versions: Mapped[list[GapAnalysisReportVersion]] = relationship(
        "GapAnalysisReportVersion",
        back_populates="report",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="GapAnalysisReportVersion.version_number.desc()",
    )


class GapAnalysisReportVersion(TimestampedUUIDModel):
    __tablename__ = "gap_analysis_report_versions"
    __table_args__ = (
        UniqueConstraint(
            "report_id", "version_number", name="uq_gap_analysis_report_version_number"
        ),
    )

    report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("gap_analysis_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    report: Mapped[GapAnalysisReport] = relationship("GapAnalysisReport", back_populates="versions")
