from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import MaturityResponseStatus, MaturityValidationStatus
from app.models.base import TimestampedUUIDModel


class MaturityResponse(TimestampedUUIDModel):
    __tablename__ = "maturity_responses"

    questionnaire_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("maturity_questionnaires.id", ondelete="CASCADE"),
        nullable=False,
    )
    respondent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    respondent_email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[MaturityResponseStatus] = mapped_column(
        SAEnum(
            MaturityResponseStatus,
            name="maturity_response_status_enum",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=MaturityResponseStatus.ACTIVE,
    )
    estado_validacion: Mapped[MaturityValidationStatus] = mapped_column(
        SAEnum(MaturityValidationStatus, name="maturity_validation_status_enum"),
        nullable=False,
        default=MaturityValidationStatus.PENDIENTE,
    )
    anulation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    anulated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    anulated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    validated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validation_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    questionnaire: Mapped[MaturityQuestionnaire] = relationship(
        "MaturityQuestionnaire",
        back_populates="responses",
    )
    answers: Mapped[list[MaturityAnswer]] = relationship(
        "MaturityAnswer",
        back_populates="response",
        cascade="all, delete-orphan",
    )
