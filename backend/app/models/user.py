import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import UserStatus, UserType
from app.models.base import TimestampedUUIDModel


class User(TimestampedUUIDModel):
    __tablename__ = "users"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_usuario: Mapped[UserType] = mapped_column(
        SAEnum(UserType, name="user_type_enum"), nullable=False
    )
    estado: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status_enum"),
        nullable=False,
        default=UserStatus.ACTIVO,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped["User | None"] = relationship("User", remote_side="User.id")
    company: Mapped["Company | None"] = relationship("Company", back_populates="users")
    managed_projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="manager_user", passive_deletes=True
    )
    memberships: Mapped[list["ProjectMembership"]] = relationship(
        "ProjectMembership",
        back_populates="user",
        passive_deletes=True,
        foreign_keys="ProjectMembership.user_id",
    )
