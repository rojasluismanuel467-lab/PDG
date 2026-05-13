from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MaturitySubdomain(Base):
    __tablename__ = "maturity_subdomains"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    dimension_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maturity_dimensions.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    dimension: Mapped[MaturityDimension] = relationship(
        "MaturityDimension",
        back_populates="subdomains",
    )
