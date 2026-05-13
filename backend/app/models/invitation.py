import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import InvitationStatus, UserType
from app.models.base import TimestampedUUIDModel


class Invitation(TimestampedUUIDModel):
    __tablename__ = "invitations"

    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    invited_user_type: Mapped[UserType] = mapped_column(
        SAEnum(UserType, name="invited_user_type_enum"), nullable=False
    )
    status: Mapped[InvitationStatus] = mapped_column(
        SAEnum(InvitationStatus, name="invitation_status_enum"),
        nullable=False,
        default=InvitationStatus.PENDIENTE,
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    invited_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
