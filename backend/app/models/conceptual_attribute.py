from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class ConceptualAttribute(TimestampedUUIDModel):
    __tablename__ = "conceptual_attributes"
    __table_args__ = (
        UniqueConstraint(
            "entity_id", "client_id", name="uq_conceptual_attributes_entity_client_id"
        ),
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conceptual_entities.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    data_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_pk: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_fk: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_nullable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fk_entity_client_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    fk_attribute_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    entity: Mapped[ConceptualEntity] = relationship("ConceptualEntity", back_populates="attributes")
