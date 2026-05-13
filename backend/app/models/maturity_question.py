from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class MaturityQuestion(TimestampedUUIDModel):
    __tablename__ = "maturity_questions"

    questionnaire_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("maturity_questionnaires.id", ondelete="CASCADE"),
        nullable=False,
    )
    dimension_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maturity_dimensions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    subdomain_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maturity_subdomains.id", ondelete="RESTRICT"),
        nullable=False,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    applicable_roles: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    score_criteria_override: Mapped[list[dict[str, int | str]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    weight: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    questionnaire: Mapped[MaturityQuestionnaire] = relationship(
        "MaturityQuestionnaire",
        back_populates="questions",
    )
    answers: Mapped[list[MaturityAnswer]] = relationship(
        "MaturityAnswer",
        back_populates="question",
    )
