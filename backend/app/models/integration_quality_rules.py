from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class IntegrationQualityRules(TimestampedUUIDModel):
    __tablename__ = "integration_quality_rules"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "artifact_id", name="uq_integration_quality_rules_project_artifact"
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("project_artifacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    technical_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    rules: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    acceptance_criteria: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    target_formats: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    current_version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    versions: Mapped[list[IntegrationQualityRulesVersion]] = relationship(
        "IntegrationQualityRulesVersion",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="IntegrationQualityRulesVersion.version_number.desc()",
    )


class IntegrationQualityRulesVersion(TimestampedUUIDModel):
    __tablename__ = "integration_quality_rules_versions"
    __table_args__ = (
        UniqueConstraint(
            "document_id", "version_number", name="uq_integration_quality_rules_version_number"
        ),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_quality_rules.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    document: Mapped[IntegrationQualityRules] = relationship(
        "IntegrationQualityRules",
        back_populates="versions",
    )
