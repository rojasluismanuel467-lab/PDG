from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ProjectBlock
from app.models.base import TimestampedUUIDModel


class ConceptualModel(TimestampedUUIDModel):
    __tablename__ = "conceptual_models"
    __table_args__ = (UniqueConstraint("artifact_id", name="uq_conceptual_models_artifact_id"),)

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
    phase: Mapped[ProjectBlock] = mapped_column(
        SAEnum(ProjectBlock, name="conceptual_model_phase_enum"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    current_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_saved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    entities: Mapped[list[ConceptualEntity]] = relationship(
        "ConceptualEntity",
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    relations: Mapped[list[ConceptualRelation]] = relationship(
        "ConceptualRelation",
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    versions: Mapped[list[ConceptualModelVersion]] = relationship(
        "ConceptualModelVersion",
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    comments: Mapped[list[ConceptualComment]] = relationship(
        "ConceptualComment",
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ConceptualModelVersion(TimestampedUUIDModel):
    __tablename__ = "conceptual_model_versions"
    __table_args__ = (
        UniqueConstraint(
            "model_id", "version_number", name="uq_conceptual_model_versions_model_version"
        ),
    )

    model_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("conceptual_models.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    model: Mapped[ConceptualModel] = relationship("ConceptualModel", back_populates="versions")
