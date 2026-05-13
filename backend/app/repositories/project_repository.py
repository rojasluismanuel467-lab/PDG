from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_artifact_permission import ProjectArtifactPermission
from app.models.project_membership import ProjectMembership


class ProjectRepository:
    @staticmethod
    def create_project(db: Session, *, project: Project) -> Project:
        db.add(project)
        db.flush()
        db.refresh(project)
        return project

    @staticmethod
    def get_project_by_id(db: Session, *, project_id: uuid.UUID) -> Project | None:
        stmt: Select[tuple[Project]] = (
            select(Project)
            .options(
                selectinload(Project.manager_user),
                selectinload(Project.artifacts),
                selectinload(Project.company),
            )
            .where(Project.id == project_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list_projects_for_user(db: Session, *, user_id: uuid.UUID) -> list[Project]:
        stmt: Select[tuple[Project]] = (
            select(Project)
            .options(
                selectinload(Project.manager_user),
                selectinload(Project.artifacts),
                selectinload(Project.company),
            )
            .where(
                (Project.manager_user_id == user_id)
                | (
                    Project.id.in_(
                        select(ProjectMembership.project_id).where(
                            ProjectMembership.user_id == user_id
                        )
                    )
                )
            )
            .order_by(Project.created_at.desc())
        )
        return db.execute(stmt).scalars().unique().all()

    @staticmethod
    def create_manager_membership(
        db: Session,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectMembership:
        membership = ProjectMembership(
            project_id=project_id,
            user_id=user_id,
            is_manager=True,
            project_permission_level=5,
            nivel_asis=5,
            nivel_tobe=5,
            nivel_brechas=5,
            nivel_roadmap=5,
            assigned_by_user_id=user_id,
        )
        db.add(membership)
        db.flush()
        db.refresh(membership)
        return membership

    @staticmethod
    def create_artifacts(db: Session, *, artifacts: list[ProjectArtifact]) -> list[ProjectArtifact]:
        db.add_all(artifacts)
        db.flush()
        return artifacts

    @staticmethod
    def get_artifact_by_id(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> ProjectArtifact | None:
        stmt: Select[tuple[ProjectArtifact]] = (
            select(ProjectArtifact)
            .options(selectinload(ProjectArtifact.permissions))
            .where(
                ProjectArtifact.project_id == project_id,
                ProjectArtifact.id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list_artifacts_by_project(db: Session, *, project_id: uuid.UUID) -> list[ProjectArtifact]:
        stmt: Select[tuple[ProjectArtifact]] = (
            select(ProjectArtifact)
            .options(selectinload(ProjectArtifact.permissions))
            .where(ProjectArtifact.project_id == project_id)
            .order_by(ProjectArtifact.order_index.asc(), ProjectArtifact.created_at.asc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def get_membership(
        db: Session,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectMembership | None:
        stmt: Select[tuple[ProjectMembership]] = select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
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
    def add_audit_log(
        db: Session,
        *,
        user_id: uuid.UUID | None,
        perfil_usuario: object | None,
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
