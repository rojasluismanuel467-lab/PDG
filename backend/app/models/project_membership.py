import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedUUIDModel


class ProjectMembership(TimestampedUUIDModel):
    __tablename__ = "project_memberships"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_membership_project_user"),
        CheckConstraint(
            "project_permission_level IS NULL OR (project_permission_level >= 0 AND project_permission_level <= 5)",
            name="ck_membership_project_permission_level_0_5",
        ),
        CheckConstraint(
            "nivel_asis IS NULL OR (nivel_asis >= 0 AND nivel_asis <= 5)",
            name="ck_membership_nivel_asis_0_5",
        ),
        CheckConstraint(
            "nivel_tobe IS NULL OR (nivel_tobe >= 0 AND nivel_tobe <= 5)",
            name="ck_membership_nivel_tobe_0_5",
        ),
        CheckConstraint(
            "nivel_brechas IS NULL OR (nivel_brechas >= 0 AND nivel_brechas <= 5)",
            name="ck_membership_nivel_brechas_0_5",
        ),
        CheckConstraint(
            "nivel_roadmap IS NULL OR (nivel_roadmap >= 0 AND nivel_roadmap <= 5)",
            name="ck_membership_nivel_roadmap_0_5",
        ),
        CheckConstraint(
            "(NOT is_manager) OR (project_permission_level = 5 AND nivel_asis = 5 AND nivel_tobe = 5 AND nivel_brechas = 5 AND nivel_roadmap = 5)",
            name="ck_membership_manager_levels",
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_manager: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    project_permission_level: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None
    )
    nivel_asis: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    nivel_tobe: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    nivel_brechas: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    nivel_roadmap: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    project: Mapped["Project"] = relationship("Project", back_populates="memberships")
    user: Mapped["User"] = relationship(
        "User", back_populates="memberships", foreign_keys=[user_id]
    )
