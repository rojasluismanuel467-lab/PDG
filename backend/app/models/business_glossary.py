from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class BusinessGlossary(TimestampedUUIDModel):
    __tablename__ = "business_glossaries"
    __table_args__ = (
        UniqueConstraint("project_id", "artifact_id", name="uq_business_glossary_project_artifact"),
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    terms: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    comments: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    current_version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
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
    last_saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    versions: Mapped[list[BusinessGlossaryVersion]] = relationship(
        "BusinessGlossaryVersion",
        back_populates="glossary",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="BusinessGlossaryVersion.version_number.desc()",
    )


class BusinessGlossaryVersion(TimestampedUUIDModel):
    __tablename__ = "business_glossary_versions"
    __table_args__ = (
        UniqueConstraint(
            "glossary_id", "version_number", name="uq_business_glossary_version_number"
        ),
    )

    glossary_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("business_glossaries.id", ondelete="CASCADE"),
        nullable=False,
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

    glossary: Mapped[BusinessGlossary] = relationship("BusinessGlossary", back_populates="versions")
