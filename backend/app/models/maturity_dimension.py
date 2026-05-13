from __future__ import annotations

from sqlalchemy import Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MaturityDimension(Base):
    __tablename__ = "maturity_dimensions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    subdomains: Mapped[list[MaturitySubdomain]] = relationship(
        "MaturitySubdomain",
        back_populates="dimension",
        cascade="all, delete-orphan",
    )
