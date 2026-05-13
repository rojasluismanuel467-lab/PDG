from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class InventoryMatrix(TimestampedUUIDModel):
    __tablename__ = "inventory_matrices"
    __table_args__ = (
        UniqueConstraint("project_id", "artifact_id", name="uq_inventory_matrix_project_artifact"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("project_artifacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    systems: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    comments: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    current_version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    versions: Mapped[list[InventoryMatrixVersion]] = relationship(
        "InventoryMatrixVersion",
        back_populates="matrix",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="InventoryMatrixVersion.version_number.desc()",
    )


class InventoryMatrixVersion(TimestampedUUIDModel):
    __tablename__ = "inventory_matrix_versions"
    __table_args__ = (
        UniqueConstraint("matrix_id", "version_number", name="uq_inventory_matrix_version_number"),
    )

    matrix_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventory_matrices.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    matrix: Mapped[InventoryMatrix] = relationship("InventoryMatrix", back_populates="versions")
