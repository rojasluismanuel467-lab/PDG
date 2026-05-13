from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import UserType
from app.models.base import TimestampedUUIDModel


class ConceptualComment(TimestampedUUIDModel):
    __tablename__ = "conceptual_model_comments"

    model_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("conceptual_models.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_client_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    created_in_version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    outdated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_user_type: Mapped[UserType] = mapped_column(
        SAEnum(UserType, name="user_type_enum"),
        nullable=False,
    )

    model: Mapped[ConceptualModel] = relationship("ConceptualModel", back_populates="comments")
