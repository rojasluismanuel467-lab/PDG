from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampedUUIDModel


class LogicalDataModel(TimestampedUUIDModel):
    __tablename__ = "logical_data_models"
    __table_args__ = (
        UniqueConstraint("project_id", "artifact_id", name="uq_logical_model_project_artifact"),
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
    phase: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    tables: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    sql_ddl: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    comments: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    versions: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    current_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1.0")

    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )
