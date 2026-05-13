from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.dfd import (
    DFDCommentCreateRequest,
    DFDCommentResponse,
    DFDModelResponse,
    DFDModelSnapshotRequest,
    DFDRestoreVersionRequest,
    DFDVersionPreviewResponse,
    DFDVersionsResponse,
)
from app.services.dfd_service import DFDService

router = APIRouter(tags=["dfd"])


@router.get("/projects/{project_id}/artifacts/{artifact_id}/dfd", response_model=DFDModelResponse)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd",
    response_model=DFDModelResponse,
    include_in_schema=False,
)
def get_dfd_model(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> DFDModelResponse:
    return DFDService.get_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put("/projects/{project_id}/artifacts/{artifact_id}/dfd", response_model=DFDModelResponse)
@router.put(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd",
    response_model=DFDModelResponse,
    include_in_schema=False,
)
def save_dfd_model(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: DFDModelSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> DFDModelResponse:
    return DFDService.upsert_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/dfd/versions",
    response_model=DFDVersionsResponse,
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd/versiones",
    response_model=DFDVersionsResponse,
    include_in_schema=False,
)
def list_dfd_versions(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> DFDVersionsResponse:
    return DFDService.list_versions(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/dfd/versions/{version_number}/preview",
    response_model=DFDVersionPreviewResponse,
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd/versiones/{version_number}/preview",
    response_model=DFDVersionPreviewResponse,
    include_in_schema=False,
)
def preview_dfd_version(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> DFDVersionPreviewResponse:
    return DFDService.preview_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        source_version_number=version_number,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/dfd/restore-version",
    response_model=DFDModelResponse,
)
@router.post(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd/restaurar-version",
    response_model=DFDModelResponse,
    include_in_schema=False,
)
def restore_dfd_version(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: DFDRestoreVersionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> DFDModelResponse:
    return DFDService.restore_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/dfd/comments",
    response_model=list[DFDCommentResponse],
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd/comentarios",
    response_model=list[DFDCommentResponse],
    include_in_schema=False,
)
def list_dfd_comments(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[DFDCommentResponse]:
    return DFDService.list_comments(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/dfd/comments", response_model=DFDCommentResponse
)
@router.post(
    "/proyectos/{project_id}/entregables/{artifact_id}/dfd/comentarios",
    response_model=DFDCommentResponse,
    include_in_schema=False,
)
def create_dfd_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: DFDCommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> DFDCommentResponse:
    return DFDService.create_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )
