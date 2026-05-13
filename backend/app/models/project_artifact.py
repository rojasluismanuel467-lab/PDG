from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ProjectArtifactStatus, ProjectBlock
from app.models.base import TimestampedUUIDModel


class ProjectArtifact(TimestampedUUIDModel):
    __tablename__ = "project_artifacts"
    __table_args__ = (
        UniqueConstraint("project_id", "code", name="uq_project_artifact_project_code"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    block: Mapped[ProjectBlock] = mapped_column(
        SAEnum(ProjectBlock, name="project_artifact_block_enum"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    block_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ProjectArtifactStatus] = mapped_column(
        SAEnum(ProjectArtifactStatus, name="project_artifact_status_enum"),
        nullable=False,
        default=ProjectArtifactStatus.PENDING,
    )
    is_applicable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    consultant_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    company_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consultant_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    company_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_cycles: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped[Project] = relationship("Project", back_populates="artifacts")
    permissions: Mapped[list[ProjectArtifactPermission]] = relationship(
        "ProjectArtifactPermission",
        back_populates="artifact",
        passive_deletes=True,
    )
