import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.project_membership import (
    ArtifactPermissionResponse,
    ArtifactPermissionsListResponse,
    InviteProjectMemberRequest,
    InviteProjectMemberResponse,
    ProjectMemberResponse,
    ProjectMembersListResponse,
    RemoveProjectMemberResponse,
    UpdateArtifactPermissionRequest,
    UpdateProjectMemberPermissionsRequest,
)
from app.services.project_membership_service import ProjectMembershipService

router = APIRouter(prefix="/projects", tags=["project-memberships"])


@router.post(
    "/{project_id}/members/invite",
    response_model=InviteProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_project_member(
    project_id: uuid.UUID,
    payload: InviteProjectMemberRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InviteProjectMemberResponse:
    return ProjectMembershipService.invite_member(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.get("/{project_id}/members", response_model=ProjectMembersListResponse)
def list_project_members(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectMembersListResponse:
    return ProjectMembershipService.list_members(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
    )


@router.patch(
    "/{project_id}/members/{user_id}/permissions",
    response_model=ProjectMemberResponse,
)
def update_project_member_permissions(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: UpdateProjectMemberPermissionsRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectMemberResponse:
    return ProjectMembershipService.update_member_permissions(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        target_user_id=user_id,
        payload=payload,
    )


@router.get(
    "/{project_id}/members/{user_id}/artifact-permissions",
    response_model=ArtifactPermissionsListResponse,
)
def list_member_artifact_permissions(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ArtifactPermissionsListResponse:
    items = ProjectMembershipService.list_artifact_permissions(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        target_user_id=user_id,
    )
    return ArtifactPermissionsListResponse(items=items)


@router.delete(
    "/{project_id}/artifacts/{artifact_id}/permissions/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project_artifact_permission(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> None:
    ProjectMembershipService.delete_artifact_permission(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        target_user_id=user_id,
    )


@router.patch(
    "/{project_id}/artifacts/{artifact_id}/permissions/{user_id}",
    response_model=ArtifactPermissionResponse,
)
def update_project_artifact_permission(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: UpdateArtifactPermissionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ArtifactPermissionResponse:
    return ProjectMembershipService.update_artifact_permission(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        target_user_id=user_id,
        payload=payload,
    )


@router.delete(
    "/{project_id}/members/{user_id}",
    response_model=RemoveProjectMemberResponse,
)
def remove_project_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> RemoveProjectMemberResponse:
    return ProjectMembershipService.remove_member(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        target_user_id=user_id,
    )
