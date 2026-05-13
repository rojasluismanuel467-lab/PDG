from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, UserType
from app.core.permissions import BLOCK_PERMISSION_FIELD_MAP
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_membership import ProjectMembership
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository


class ProjectPermissionService:
    @staticmethod
    def get_project_or_raise(db: Session, *, project_id: uuid.UUID) -> Project:
        project = ProjectRepository.get_project_by_id(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")
        return project

    @classmethod
    def get_membership_or_raise(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> tuple[Project, ProjectMembership | None]:
        project = cls.get_project_or_raise(db, project_id=project_id)
        
        # Check if user is the manager
        if project.manager_user_id == actor_user_id:
            return project, None

        membership = ProjectRepository.get_membership(
            db,
            project_id=project_id,
            user_id=actor_user_id,
        )

        # Administrators bypass the membership requirement if it's missing
        if membership is None:
            user = UserRepository.get_by_id(db, user_id=actor_user_id)
            if user and user.tipo_usuario == "ADMINISTRADOR":
                return project, None
            raise ForbiddenDomainError("You are not a member of this project")
            
        return project, membership

    @staticmethod
    def resolve_effective_level(
        *,
        project: Project,
        membership: ProjectMembership | None,
        artifact: ProjectArtifact | None,
        artifact_level: int | None,
        actor_user_type: str | None = None,
    ) -> int:
        # If no membership, it's either the manager or an administrator
        if membership is None and artifact_level is None:
            return int(PermissionLevel.DELEGAR)
        
        # Explicit override for administrators
        if actor_user_type == "ADMINISTRADOR":
            return int(PermissionLevel.DELEGAR)

        if artifact_level is not None:
            return int(artifact_level)
        if artifact is not None and membership is not None:
            block_field = BLOCK_PERMISSION_FIELD_MAP[artifact.block]
            block_level = getattr(membership, block_field)
            if block_level is not None and int(block_level) > 0:
                return int(block_level)
        
        if membership is not None and membership.project_permission_level is not None and int(membership.project_permission_level) > 0:
            return int(membership.project_permission_level)
            
        # Fallback for EMPRESA and CONSULTOR users: 
        # If they are members, they should be able to approve by default (at least for single-approval artifacts).
        if actor_user_type in {UserType.EMPRESA, UserType.CONSULTOR} and membership is not None:
            return int(PermissionLevel.APROBAR)

        return int(PermissionLevel.SIN_ACCESO)

    @classmethod
    def resolve_project_level(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        minimum_level: PermissionLevel = PermissionLevel.SIN_ACCESO,
    ) -> tuple[Project, ProjectMembership | None, int]:
        project, membership = cls.get_membership_or_raise(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )
        user = UserRepository.get_by_id(db, user_id=actor_user_id)
        level = cls.resolve_effective_level(
            project=project,
            membership=membership,
            artifact=None,
            artifact_level=None,
            actor_user_type=user.tipo_usuario if user else None,
        )
        if level < int(minimum_level):
            raise ForbiddenDomainError(
                f"Insufficient project permission: required {int(minimum_level)}, current {level}"
            )
        return project, membership, level

    @classmethod
    def resolve_artifact_level(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        artifact: ProjectArtifact,
        minimum_level: PermissionLevel = PermissionLevel.SIN_ACCESO,
    ) -> tuple[Project, ProjectMembership | None, int]:
        project, membership = cls.get_membership_or_raise(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )

        artifact_permission = None
        if membership is not None:
            artifact_permission = ProjectRepository.get_artifact_permission(
                db,
                artifact_id=artifact.id,
                user_id=actor_user_id,
            )

        user = UserRepository.get_by_id(db, user_id=actor_user_id)
        level = cls.resolve_effective_level(
            project=project,
            membership=membership,
            artifact=artifact,
            artifact_level=artifact_permission.permission_level if artifact_permission else None,
            actor_user_type=user.tipo_usuario if user else None,
        )
        if level < int(minimum_level):
            raise ForbiddenDomainError(
                f"Insufficient permission for artifact {artifact.code}: required {int(minimum_level)}, current {level}"
            )
        return project, membership, level
