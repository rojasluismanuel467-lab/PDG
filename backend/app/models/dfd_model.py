from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class DFDModel(TimestampedUUIDModel):
    __tablename__ = "dfd_models"
    __table_args__ = (
        UniqueConstraint("project_id", "artifact_id", name="uq_dfd_model_project_artifact"),
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
    phase: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    nodes: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    flows: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
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

    versions: Mapped[list[DFDVersion]] = relationship(
        "DFDVersion",
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DFDVersion.version_number.desc()",
    )
    comments: Mapped[list[DFDComment]] = relationship(
        "DFDComment",
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
