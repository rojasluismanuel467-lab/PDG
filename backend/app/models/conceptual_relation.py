from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class ConceptualRelation(TimestampedUUIDModel):
    __tablename__ = "conceptual_relations"
    __table_args__ = (
        UniqueConstraint("model_id", "client_id", name="uq_conceptual_relations_model_client_id"),
    )

    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conceptual_models.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_entity_client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    target_entity_client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    cardinality: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fk_attribute_client_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    model: Mapped[ConceptualModel] = relationship("ConceptualModel", back_populates="relations")
