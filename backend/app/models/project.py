import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ProjectStatus
from app.models.base import TimestampedUUIDModel


class Project(TimestampedUUIDModel):
    __tablename__ = "projects"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_company_email: Mapped[str] = mapped_column(String(255), nullable=False)
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=True
    )
    estimated_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, name="project_status_enum"),
        nullable=False,
        default=ProjectStatus.ACTIVO,
    )
    manager_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    manager_user: Mapped["User"] = relationship("User", back_populates="managed_projects")
    company: Mapped["Company | None"] = relationship("Company", back_populates="projects")
    memberships: Mapped[list["ProjectMembership"]] = relationship(
        "ProjectMembership", back_populates="project", passive_deletes=True
    )
    artifacts: Mapped[list["ProjectArtifact"]] = relationship(
        "ProjectArtifact",
        back_populates="project",
        passive_deletes=True,
    )
