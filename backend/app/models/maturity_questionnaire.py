from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ProjectBlock
from app.models.base import TimestampedUUIDModel


class MaturityQuestionnaire(TimestampedUUIDModel):
    __tablename__ = "maturity_questionnaires"
    __table_args__ = (
        UniqueConstraint("project_id", "phase", name="uq_maturity_questionnaire_project_phase"),
        UniqueConstraint("access_code", name="uq_maturity_questionnaire_access_code"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    phase: Mapped[ProjectBlock] = mapped_column(
        String(20), nullable=False, default=ProjectBlock.AS_IS
    )
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    access_code: Mapped[str] = mapped_column(String(64), nullable=False)
    dimension_weights_override: Mapped[dict[str, float]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    custom_roles_override: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    score_criteria_override: Mapped[list[dict[str, int | str]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    access_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    questions: Mapped[list[MaturityQuestion]] = relationship(
        "MaturityQuestion",
        back_populates="questionnaire",
        cascade="all, delete-orphan",
    )
    responses: Mapped[list[MaturityResponse]] = relationship(
        "MaturityResponse",
        back_populates="questionnaire",
        cascade="all, delete-orphan",
    )
