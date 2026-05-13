from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import MaturityValidationStatus
from app.models.base import TimestampedUUIDModel


class MaturityAnswer(TimestampedUUIDModel):
    __tablename__ = "maturity_answers"
    __table_args__ = (
        UniqueConstraint("response_id", "question_id", name="uq_maturity_answer_response_question"),
        CheckConstraint(
            "respondent_score >= 0",
            name="ck_maturity_answer_respondent_score",
        ),
        CheckConstraint(
            "(validated_score IS NULL) OR (validated_score >= 0)",
            name="ck_maturity_answer_validated_score",
        ),
    )

    response_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("maturity_responses.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("maturity_questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    respondent_score: Mapped[int] = mapped_column(Integer, nullable=False)
    validated_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado_validacion: Mapped[MaturityValidationStatus] = mapped_column(
        SAEnum(MaturityValidationStatus, name="maturity_answer_validation_status_enum"),
        nullable=False,
        default=MaturityValidationStatus.PENDIENTE,
    )
    validation_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    respondent_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_size: Mapped[int | None] = mapped_column(Integer, nullable=True)

    response: Mapped[MaturityResponse] = relationship(
        "MaturityResponse",
        back_populates="answers",
    )
    question: Mapped[MaturityQuestion] = relationship(
        "MaturityQuestion",
        back_populates="answers",
    )
