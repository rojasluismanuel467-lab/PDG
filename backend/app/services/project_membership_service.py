from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.enums import UserStatus, UserType
from app.core.permissions import BLOCK_PERMISSION_FIELD_MAP, PermissionLevel, can_assign_level
from app.exceptions.domain import (
    ConflictDomainError,
    ForbiddenDomainError,
    NotFoundDomainError,
)
from app.models.project_artifact_permission import ProjectArtifactPermission
from app.models.project_membership import ProjectMembership
from app.models.user import User
from app.repositories.project_membership_repository import ProjectMembershipRepository
from app.schemas.project_membership import (
    ArtifactPermissionResponse,
    InviteProjectMemberRequest,
    InviteProjectMemberResponse,
    ProjectMemberResponse,
    ProjectMembersListResponse,
    ProjectPermissionLevels,
    RemoveProjectMemberResponse,
    UpdateArtifactPermissionRequest,
    UpdateProjectMemberPermissionsRequest,
)


@dataclass
class _ProjectAccessContext:
    is_manager: bool
    actor_membership: ProjectMembership | None


class ProjectMembershipService:
    @staticmethod
    def _resolve_project_access(
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> _ProjectAccessContext:
        project = ProjectMembershipRepository.get_project_by_id(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")

        is_manager = project.manager_user_id == actor_user_id
        actor_membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=actor_user_id,
        )
        if not is_manager and actor_membership is None:
            raise ForbiddenDomainError("You are not a member of this project")

        return _ProjectAccessContext(
            is_manager=is_manager,
            actor_membership=actor_membership,
        )

    @staticmethod
    def _actor_level_for_field(
        *,
        context: _ProjectAccessContext,
        field_name: str,
    ) -> int:
        if context.is_manager:
            return 5
        if context.actor_membership is None:
            return 0
        level = getattr(context.actor_membership, field_name)
        if level is not None:
            return int(level)
        project_level = context.actor_membership.project_permission_level
        return int(project_level) if project_level is not None else 0

    @classmethod
    def _validate_permission_changes(
        cls,
        *,
        context: _ProjectAccessContext,
        requested_fields: dict[str, int],
    ) -> None:
        field_labels = {
            "project_permission_level": "PROJECT",
            "nivel_asis": "AS_IS",
            "nivel_tobe": "TO_BE",
            "nivel_brechas": "BRECHAS",
            "nivel_roadmap": "ROADMAP",
        }

        for field_name, target_level in requested_fields.items():
            actor_level = cls._actor_level_for_field(context=context, field_name=field_name)
            if not can_assign_level(
                assigner_level=actor_level,
                target_level=target_level,
                is_assigner_manager=context.is_manager,
            ):
                raise ForbiddenDomainError(
                    f"You cannot assign level {target_level} in {field_labels[field_name]} with your current permission"
                )

    @staticmethod
    def _to_artifact_permission_response(
        permission: ProjectArtifactPermission,
    ) -> ArtifactPermissionResponse:
        return ArtifactPermissionResponse(
            artifact_id=permission.artifact_id,
            project_id=permission.project_id,
            user_id=permission.user_id,
            permission_level=permission.permission_level,
            assigned_by_user_id=permission.assigned_by_user_id,
            created_at=permission.created_at,
            updated_at=permission.updated_at,
        )

    @staticmethod
    def _to_member_response(membership: ProjectMembership, user: User) -> ProjectMemberResponse:
        return ProjectMemberResponse(
            membership_id=membership.id,
            project_id=membership.project_id,
            user_id=membership.user_id,
            nombre=user.nombre,
            email=user.email,
            tipo_usuario=user.tipo_usuario,
            estado_usuario=user.estado,
            is_manager=membership.is_manager,
            assigned_by_user_id=membership.assigned_by_user_id,
            permisos=ProjectPermissionLevels(
                project_permission_level=membership.project_permission_level,
                nivel_asis=membership.nivel_asis,
                nivel_tobe=membership.nivel_tobe,
                nivel_brechas=membership.nivel_brechas,
                nivel_roadmap=membership.nivel_roadmap,
            ),
            created_at=membership.created_at,
            updated_at=membership.updated_at,
        )

    @classmethod
    def invite_member(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: InviteProjectMemberRequest,
    ) -> InviteProjectMemberResponse:
        context = cls._resolve_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )

        requested = {
            key: value
            for key, value in {
                "project_permission_level": payload.project_permission_level,
                "nivel_asis": payload.nivel_asis,
                "nivel_tobe": payload.nivel_tobe,
                "nivel_brechas": payload.nivel_brechas,
                "nivel_roadmap": payload.nivel_roadmap,
            }.items()
            if value is not None
        }
        if not context.is_manager and not requested:
            raise ForbiddenDomainError("Delegated users must assign at least one block explicitly")
        cls._validate_permission_changes(context=context, requested_fields=requested)

        is_empresa = payload.tipo_usuario == UserType.EMPRESA
        target_project_permission_level = payload.project_permission_level
        if target_project_permission_level is None and is_empresa:
            target_project_permission_level = int(PermissionLevel.LECTURA)

        target_nivel_asis = payload.nivel_asis
        if target_nivel_asis is None and is_empresa:
            target_nivel_asis = int(PermissionLevel.APROBAR)

        target_nivel_tobe = payload.nivel_tobe
        if target_nivel_tobe is None and is_empresa:
            target_nivel_tobe = int(PermissionLevel.APROBAR)

        target_nivel_brechas = payload.nivel_brechas
        if target_nivel_brechas is None and is_empresa:
            target_nivel_brechas = int(PermissionLevel.APROBAR)

        target_nivel_roadmap = payload.nivel_roadmap
        if target_nivel_roadmap is None and is_empresa:
            target_nivel_roadmap = int(PermissionLevel.APROBAR)

        email = payload.email.lower()
        target_user = ProjectMembershipRepository.get_user_by_email(db, email=email)
        if target_user is not None:
            if target_user.tipo_usuario != payload.tipo_usuario:
                raise ConflictDomainError("User type is fixed and does not match this invitation")
            if target_user.estado == UserStatus.INACTIVO:
                raise ConflictDomainError("Cannot invite an inactive user")
        else:
            inferred_name = payload.nombre.strip() if payload.nombre else email.split("@")[0]
            target_user = ProjectMembershipRepository.create_user(
                db,
                nombre=inferred_name,
                email=email,
                tipo_usuario=payload.tipo_usuario,
                estado=UserStatus.ACTIVO,
                created_by_user_id=actor_user_id,
            )

        existing_membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=target_user.id,
        )
        if existing_membership is not None:
            raise ConflictDomainError("User is already a member of this project")

        membership = ProjectMembershipRepository.create_membership(
            db,
            project_id=project_id,
            user_id=target_user.id,
            is_manager=False,
            project_permission_level=target_project_permission_level,
            nivel_asis=target_nivel_asis,
            nivel_tobe=target_nivel_tobe,
            nivel_brechas=target_nivel_brechas,
            nivel_roadmap=target_nivel_roadmap,
            assigned_by_user_id=actor_user_id,
        )

        ProjectMembershipRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project_id,
            tipo_accion="MIEMBRO_INVITADO",
            descripcion=f"Member invited: {target_user.email}",
            resource_id=membership.id,
            datos_adicionales={
                "user_id": str(target_user.id),
                "tipo_usuario": target_user.tipo_usuario.value,
                "niveles": {
                    "project": target_project_permission_level,
                    "asis": target_nivel_asis,
                    "tobe": target_nivel_tobe,
                    "brechas": target_nivel_brechas,
                    "roadmap": target_nivel_roadmap,
                },
                "requires_activation": False,
            },
        )

        db.commit()
        db.refresh(membership)

        return InviteProjectMemberResponse(
            message="Member added to project",
            member=cls._to_member_response(membership, target_user),
            invitation_token=None,
            invitation_expires_at=None,
        )

    @classmethod
    def list_members(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> ProjectMembersListResponse:
        cls._resolve_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )

        memberships = ProjectMembershipRepository.list_memberships(db, project_id=project_id)
        items = [cls._to_member_response(member, member.user) for member in memberships]
        return ProjectMembersListResponse(total=len(items), items=items)

    @classmethod
    def update_member_permissions(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        target_user_id: uuid.UUID,
        payload: UpdateProjectMemberPermissionsRequest,
    ) -> ProjectMemberResponse:
        context = cls._resolve_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )

        membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=target_user_id,
        )
        if membership is None:
            raise NotFoundDomainError("Project membership not found")
        if membership.is_manager:
            raise ConflictDomainError("Manager permissions cannot be modified")

        requested = {
            key: value
            for key, value in {
                "project_permission_level": payload.project_permission_level,
                "nivel_asis": payload.nivel_asis,
                "nivel_tobe": payload.nivel_tobe,
                "nivel_brechas": payload.nivel_brechas,
                "nivel_roadmap": payload.nivel_roadmap,
            }.items()
            if value is not None
        }
        cls._validate_permission_changes(context=context, requested_fields=requested)

        if payload.project_permission_level is not None:
            membership.project_permission_level = payload.project_permission_level
        if payload.nivel_asis is not None:
            membership.nivel_asis = payload.nivel_asis
        if payload.nivel_tobe is not None:
            membership.nivel_tobe = payload.nivel_tobe
        if payload.nivel_brechas is not None:
            membership.nivel_brechas = payload.nivel_brechas
        if payload.nivel_roadmap is not None:
            membership.nivel_roadmap = payload.nivel_roadmap
        membership.assigned_by_user_id = actor_user_id

        ProjectMembershipRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project_id,
            tipo_accion="PERMISOS_ACTUALIZADOS",
            descripcion=f"Permissions updated for user {target_user_id}",
            resource_id=membership.id,
            datos_adicionales={"requested_changes": {k: int(v) for k, v in requested.items()}},
        )

        db.flush()
        db.commit()
        db.refresh(membership)
        return cls._to_member_response(membership, membership.user)

    @classmethod
    def update_artifact_permission(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        target_user_id: uuid.UUID,
        payload: UpdateArtifactPermissionRequest,
    ) -> ArtifactPermissionResponse:
        context = cls._resolve_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )
        membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=target_user_id,
        )
        if membership is None:
            raise NotFoundDomainError("Project membership not found")
        if membership.is_manager:
            raise ConflictDomainError("Manager permissions cannot be modified")

        artifact = ProjectMembershipRepository.get_artifact_by_id(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
        )
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")

        actor_level = cls._actor_level_for_field(
            context=context,
            field_name=BLOCK_PERMISSION_FIELD_MAP[artifact.block],
        )
        if not can_assign_level(
            assigner_level=actor_level,
            target_level=payload.permission_level,
            is_assigner_manager=context.is_manager,
        ):
            raise ForbiddenDomainError(
                f"You cannot assign level {payload.permission_level} for artifact {artifact.code}"
            )

        permission = ProjectMembershipRepository.upsert_artifact_permission(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            user_id=target_user_id,
            permission_level=payload.permission_level,
            assigned_by_user_id=actor_user_id,
        )
        ProjectMembershipRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project_id,
            tipo_accion="ARTIFACT_PERMISSION_UPDATED",
            descripcion=f"Artifact permission updated for user {target_user_id}",
            resource_id=permission.id,
            datos_adicionales={
                "artifact_id": str(artifact_id),
                "permission_level": payload.permission_level,
            },
        )
        db.commit()
        db.refresh(permission)
        return cls._to_artifact_permission_response(permission)

    @classmethod
    def list_artifact_permissions(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        target_user_id: uuid.UUID,
    ) -> list[ArtifactPermissionResponse]:
        # Actor must be a member or manager of the project
        cls._resolve_project_access(db, project_id=project_id, actor_user_id=actor_user_id)
        permissions = ProjectMembershipRepository.list_artifact_permissions_for_member(
            db, project_id=project_id, user_id=target_user_id
        )
        return [cls._to_artifact_permission_response(p) for p in permissions]

    @classmethod
    def delete_artifact_permission(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        target_user_id: uuid.UUID,
    ) -> None:
        context = cls._resolve_project_access(db, project_id=project_id, actor_user_id=actor_user_id)
        membership = ProjectMembershipRepository.get_membership(
            db, project_id=project_id, user_id=target_user_id
        )
        if membership is None:
            raise NotFoundDomainError("Project membership not found")
        if membership.is_manager:
            raise ConflictDomainError("Manager permissions cannot be modified")

        artifact = ProjectMembershipRepository.get_artifact_by_id(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")

        actor_level = cls._actor_level_for_field(
            context=context, field_name=BLOCK_PERMISSION_FIELD_MAP[artifact.block]
        )
        if not can_assign_level(
            assigner_level=actor_level,
            target_level=0,
            is_assigner_manager=context.is_manager,
        ):
            raise ForbiddenDomainError("You cannot remove artifact permissions for this member")

        ProjectMembershipRepository.delete_artifact_permission(
            db, artifact_id=artifact_id, user_id=target_user_id
        )
        ProjectMembershipRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project_id,
            tipo_accion="ARTIFACT_PERMISSION_RESET",
            descripcion=f"Artifact permission reset for user {target_user_id}",
            resource_id=artifact_id,
            datos_adicionales={"artifact_id": str(artifact_id)},
        )
        db.commit()

    @classmethod
    def remove_member(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        target_user_id: uuid.UUID,
    ) -> RemoveProjectMemberResponse:
        context = cls._resolve_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
        )
        if not context.is_manager:
            raise ForbiddenDomainError("Only project manager can remove members")

        membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=target_user_id,
        )
        if membership is None:
            raise NotFoundDomainError("Project membership not found")
        if membership.is_manager:
            raise ConflictDomainError("Project manager cannot be removed")

        ProjectMembershipRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project_id,
            tipo_accion="MIEMBRO_REMOVIDO",
            descripcion=f"Member removed from project: {target_user_id}",
            resource_id=membership.id,
            datos_adicionales={"removed_user_id": str(target_user_id)},
        )
        ProjectMembershipRepository.delete_membership(db, membership=membership)
        db.commit()
        return RemoveProjectMemberResponse(message="Member removed successfully")
