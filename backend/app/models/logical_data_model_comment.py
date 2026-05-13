from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampedUUIDModel


class LogicalDataModelComment(TimestampedUUIDModel):
    __tablename__ = "logical_data_model_comments"

    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("logical_data_models.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_type: Mapped[str] = mapped_column(String(32), nullable=False)
    created_in_version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
