from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class ProjectArtifactPermission(TimestampedUUIDModel):
    __tablename__ = "project_artifact_permissions"
    __table_args__ = (
        UniqueConstraint(
            "artifact_id", "user_id", name="uq_project_artifact_permission_artifact_user"
        ),
        CheckConstraint(
            "permission_level >= 0 AND permission_level <= 5",
            name="ck_artifact_permission_level_0_5",
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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    permission_level: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    artifact: Mapped[ProjectArtifact] = relationship(
        "ProjectArtifact", back_populates="permissions"
    )
