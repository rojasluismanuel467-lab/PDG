from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampedUUIDModel


class LogicalDataModelVersion(TimestampedUUIDModel):
    __tablename__ = "logical_data_model_versions"
    __table_args__ = (
        UniqueConstraint("model_id", "version_number", name="uq_logical_model_version_number"),
    )

    model_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("logical_data_models.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
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
