from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class ConceptualEntity(TimestampedUUIDModel):
    __tablename__ = "conceptual_entities"
    __table_args__ = (
        UniqueConstraint("model_id", "client_id", name="uq_conceptual_entities_model_client_id"),
    )

    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conceptual_models.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    position_x: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    position_y: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    model: Mapped[ConceptualModel] = relationship("ConceptualModel", back_populates="entities")
    attributes: Mapped[list[ConceptualAttribute]] = relationship(
        "ConceptualAttribute",
        back_populates="entity",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
