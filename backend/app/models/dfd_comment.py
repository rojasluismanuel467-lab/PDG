from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DFDComment(Base):
    __tablename__ = "dfd_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dfd_models.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_client_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_type: Mapped[str] = mapped_column(String(30), nullable=False)
    created_in_version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    model: Mapped[DFDModel] = relationship("DFDModel", back_populates="comments")
