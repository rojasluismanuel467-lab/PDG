from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import UserStatus, UserType
from app.models.audit_log import AuditLog
from app.models.invitation import Invitation
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_artifact_permission import ProjectArtifactPermission
from app.models.project_membership import ProjectMembership
from app.models.user import User


class ProjectMembershipRepository:
    @staticmethod
    def get_project_by_id(db: Session, *, project_id: uuid.UUID) -> Project | None:
        stmt: Select[tuple[Project]] = select(Project).where(Project.id == project_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_by_id(db: Session, *, user_id: uuid.UUID) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_by_email(db: Session, *, email: str) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.email == email.lower())
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_user(
        db: Session,
        *,
        nombre: str,
        email: str,
        tipo_usuario: UserType,
        estado: UserStatus,
        created_by_user_id: uuid.UUID,
    ) -> User:
        user = User(
            nombre=nombre,
            email=email.lower(),
            tipo_usuario=tipo_usuario,
            estado=estado,
            password_hash=None,
            created_by_user_id=created_by_user_id,
        )
        db.add(user)
        db.flush()
        db.refresh(user)
        return user

    @staticmethod
    def get_membership(
        db: Session,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectMembership | None:
        stmt: Select[tuple[ProjectMembership]] = (
            select(ProjectMembership)
            .options(selectinload(ProjectMembership.user))
            .where(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == user_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list_memberships(db: Session, *, project_id: uuid.UUID) -> list[ProjectMembership]:
        stmt: Select[tuple[ProjectMembership]] = (
            select(ProjectMembership)
            .options(selectinload(ProjectMembership.user))
            .where(ProjectMembership.project_id == project_id)
            .order_by(ProjectMembership.created_at.asc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def create_membership(
        db: Session,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        is_manager: bool,
        project_permission_level: int | None,
        nivel_asis: int | None,
        nivel_tobe: int | None,
        nivel_brechas: int | None,
        nivel_roadmap: int | None,
        assigned_by_user_id: uuid.UUID,
    ) -> ProjectMembership:
        membership = ProjectMembership(
            project_id=project_id,
            user_id=user_id,
            is_manager=is_manager,
            project_permission_level=project_permission_level,
            nivel_asis=nivel_asis,
            nivel_tobe=nivel_tobe,
            nivel_brechas=nivel_brechas,
            nivel_roadmap=nivel_roadmap,
            assigned_by_user_id=assigned_by_user_id,
        )
        db.add(membership)
        db.flush()
        db.refresh(membership)
        return membership

    @staticmethod
    def get_artifact_by_id(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> ProjectArtifact | None:
        stmt: Select[tuple[ProjectArtifact]] = select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.id == artifact_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_artifact_permission(
        db: Session,
        *,
        artifact_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectArtifactPermission | None:
        stmt: Select[tuple[ProjectArtifactPermission]] = select(ProjectArtifactPermission).where(
            ProjectArtifactPermission.artifact_id == artifact_id,
            ProjectArtifactPermission.user_id == user_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def upsert_artifact_permission(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        user_id: uuid.UUID,
        permission_level: int,
        assigned_by_user_id: uuid.UUID,
    ) -> ProjectArtifactPermission:
        permission = ProjectMembershipRepository.get_artifact_permission(
            db,
            artifact_id=artifact_id,
            user_id=user_id,
        )
        if permission is None:
            permission = ProjectArtifactPermission(
                project_id=project_id,
                artifact_id=artifact_id,
                user_id=user_id,
                permission_level=permission_level,
                assigned_by_user_id=assigned_by_user_id,
            )
            db.add(permission)
        else:
            permission.permission_level = permission_level
            permission.assigned_by_user_id = assigned_by_user_id

        db.flush()
        db.refresh(permission)
        return permission

    @staticmethod
    def list_artifact_permissions_for_member(
        db: Session,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list[ProjectArtifactPermission]:
        stmt: Select[tuple[ProjectArtifactPermission]] = select(ProjectArtifactPermission).where(
            ProjectArtifactPermission.project_id == project_id,
            ProjectArtifactPermission.user_id == user_id,
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def delete_artifact_permission(
        db: Session,
        *,
        artifact_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectArtifactPermission | None:
        permission = ProjectMembershipRepository.get_artifact_permission(
            db, artifact_id=artifact_id, user_id=user_id
        )
        if permission is not None:
            db.delete(permission)
            db.flush()
        return permission

    @staticmethod
    def delete_membership(db: Session, *, membership: ProjectMembership) -> None:
        db.delete(membership)
        db.flush()

    @staticmethod
    def create_invitation(
        db: Session,
        *,
        token: str,
        email: str,
        invited_user_type: UserType,
        project_id: uuid.UUID,
        invited_by_user_id: uuid.UUID,
        target_user_id: uuid.UUID,
        expires_at: datetime,
    ) -> Invitation:
        invitation = Invitation(
            token=token,
            email=email.lower(),
            invited_user_type=invited_user_type,
            project_id=project_id,
            invited_by_user_id=invited_by_user_id,
            target_user_id=target_user_id,
            expires_at=expires_at.astimezone(UTC),
        )
        db.add(invitation)
        db.flush()
        db.refresh(invitation)
        return invitation

    @staticmethod
    def add_audit_log(
        db: Session,
        *,
        user_id: uuid.UUID | None,
        perfil_usuario: UserType | None,
        project_id: uuid.UUID | None,
        tipo_accion: str,
        descripcion: str,
        resource_id: uuid.UUID | None = None,
        datos_adicionales: dict[str, object] | None = None,
    ) -> AuditLog:
        log = AuditLog(
            timestamp=datetime.now(UTC),
            user_id=user_id,
            perfil_usuario=perfil_usuario,
            project_id=project_id,
            tipo_accion=tipo_accion,
            descripcion=descripcion,
            resource_id=resource_id,
            datos_adicionales=datos_adicionales or {},
        )
        db.add(log)
        db.flush()
        return log
