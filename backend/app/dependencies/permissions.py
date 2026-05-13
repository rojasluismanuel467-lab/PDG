from __future__ import annotations

from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, ProjectBlock
from app.core.permissions import BLOCK_PERMISSION_FIELD_MAP
from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError
from app.repositories.project_membership_repository import ProjectMembershipRepository


def _resolve_project_id(request: Request) -> UUID:
    raw_project_id = request.path_params.get("project_id")
    if raw_project_id is None:
        raise NotFoundDomainError("project_id path parameter is required")
    try:
        return UUID(str(raw_project_id))
    except ValueError as exc:
        raise NotFoundDomainError("Invalid project id") from exc


def require_project_member() -> Callable[..., CurrentUser]:
    def dependency(
        request: Request,
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        project_id = _resolve_project_id(request)
        project = ProjectMembershipRepository.get_project_by_id(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")

        if project.manager_user_id == current_user.id:
            return current_user

        membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=current_user.id,
        )
        if membership is None:
            raise ForbiddenDomainError("You are not a member of this project")
        return current_user

    return dependency


def require_block_level(
    *,
    block: ProjectBlock,
    minimum_level: PermissionLevel,
) -> Callable[..., CurrentUser]:
    def dependency(
        request: Request,
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        project_id = _resolve_project_id(request)
        project = ProjectMembershipRepository.get_project_by_id(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")

        if project.manager_user_id == current_user.id:
            return current_user

        membership = ProjectMembershipRepository.get_membership(
            db,
            project_id=project_id,
            user_id=current_user.id,
        )
        if membership is None:
            raise ForbiddenDomainError("You are not a member of this project")

        permission_field = BLOCK_PERMISSION_FIELD_MAP[block]
        block_level = getattr(membership, permission_field)
        if block_level is not None:
            current_level = int(block_level)
        elif membership.project_permission_level is not None:
            current_level = int(membership.project_permission_level)
        else:
            current_level = int(PermissionLevel.SIN_ACCESO)
        if current_level < int(minimum_level):
            raise ForbiddenDomainError(
                f"Insufficient permission in {block.value}: required {int(minimum_level)}, current {current_level}"
            )
        return current_user

    return dependency
