import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import RaciAssignmentType, RaciCommentReferenceType, RaciStatus
from app.models.base import TimestampedUUIDModel


class RaciMatrix(TimestampedUUIDModel):
    __tablename__ = "raci_matrices"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    entregable_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("project_artifacts.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RaciStatus] = mapped_column(
        SAEnum(RaciStatus, name="raci_status_enum"),
        nullable=False,
        default=RaciStatus.DRAFT,
    )
    version_actual: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")

    roles: Mapped[list["RaciRole"]] = relationship(
        "RaciRole", back_populates="matrix", cascade="all, delete-orphan"
    )
    activities: Mapped[list["RaciActivity"]] = relationship(
        "RaciActivity", back_populates="matrix", cascade="all, delete-orphan"
    )
    comments: Mapped[list["RaciComment"]] = relationship(
        "RaciComment", back_populates="matrix", cascade="all, delete-orphan"
    )
    history: Mapped[list["RaciVersionHistory"]] = relationship(
        "RaciVersionHistory", back_populates="matrix", cascade="all, delete-orphan"
    )


class RaciRole(TimestampedUUIDModel):
    __tablename__ = "raci_roles"

    matrix_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_matrices.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    matrix: Mapped["RaciMatrix"] = relationship("RaciMatrix", back_populates="roles")
    assignments: Mapped[list["RaciAssignment"]] = relationship(
        "RaciAssignment", back_populates="role", cascade="all, delete-orphan"
    )


class RaciActivity(TimestampedUUIDModel):
    __tablename__ = "raci_activities"

    matrix_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_matrices.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    matrix: Mapped["RaciMatrix"] = relationship("RaciMatrix", back_populates="activities")
    assignments: Mapped[list["RaciAssignment"]] = relationship(
        "RaciAssignment", back_populates="activity", cascade="all, delete-orphan"
    )


class RaciAssignment(TimestampedUUIDModel):
    __tablename__ = "raci_assignments"
    __table_args__ = (
        UniqueConstraint("activity_id", "role_id", name="uq_raci_assignment_activity_role"),
    )

    matrix_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_matrices.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_activities.id", ondelete="CASCADE"),
        nullable=False,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_roles.id", ondelete="CASCADE"),
        nullable=False,
    )
    assignment_type: Mapped[RaciAssignmentType] = mapped_column(
        SAEnum(RaciAssignmentType, name="raci_assignment_type_enum"),
        nullable=False,
    )

    activity: Mapped["RaciActivity"] = relationship("RaciActivity", back_populates="assignments")
    role: Mapped["RaciRole"] = relationship("RaciRole", back_populates="assignments")


class RaciComment(TimestampedUUIDModel):
    __tablename__ = "raci_comments"

    matrix_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_matrices.id", ondelete="CASCADE"),
        nullable=False,
    )
    reference_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), nullable=True)
    role_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), nullable=True)
    reference_type: Mapped[RaciCommentReferenceType] = mapped_column(
        SAEnum(RaciCommentReferenceType, name="raci_comment_reference_type_enum"),
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    author_perfil: Mapped[str] = mapped_column(String(255), nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(50), nullable=False, default="abierto"
    )  # abierto, resuelto

    matrix: Mapped["RaciMatrix"] = relationship("RaciMatrix", back_populates="comments")
    author: Mapped["User"] = relationship("User")


class RaciVersionHistory(TimestampedUUIDModel):
    __tablename__ = "raci_version_history"

    matrix_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("raci_matrices.id", ondelete="CASCADE"),
        nullable=False,
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    autor: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion_cambio: Mapped[str] = mapped_column(Text, nullable=False)
    total_actividades: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_roles: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    matrix: Mapped["RaciMatrix"] = relationship("RaciMatrix", back_populates="history")
