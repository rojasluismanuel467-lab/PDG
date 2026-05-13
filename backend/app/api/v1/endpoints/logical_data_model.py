from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.logical_data_model import (
    LogicalCommentCreateRequest,
    LogicalCommentResponse,
    LogicalDataModelResponse,
    LogicalDataModelUpsertRequest,
    LogicalRestoreVersionRequest,
    LogicalVersionPreviewResponse,
    LogicalVersionsResponse,
)
from app.services.logical_data_model_service import LogicalDataModelService

router = APIRouter(tags=["logical-data-model"])


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model",
    response_model=LogicalDataModelResponse,
)
def get_logical_data_model(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LogicalDataModelResponse:
    return LogicalDataModelService.get_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model",
    response_model=LogicalDataModelResponse,
)
def upsert_logical_data_model(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: LogicalDataModelUpsertRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LogicalDataModelResponse:
    return LogicalDataModelService.upsert_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/versions",
    response_model=LogicalVersionsResponse,
)
def list_logical_data_model_versions(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LogicalVersionsResponse:
    return LogicalDataModelService.list_versions(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/versions/{version_number}/preview",
    response_model=LogicalVersionPreviewResponse,
)
def preview_logical_data_model_version(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LogicalVersionPreviewResponse:
    return LogicalDataModelService.preview_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        source_version_number=version_number,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/versions/restore",
    response_model=LogicalDataModelResponse,
)
def restore_logical_data_model_version(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: LogicalRestoreVersionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LogicalDataModelResponse:
    return LogicalDataModelService.restore_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/comments",
    response_model=list[LogicalCommentResponse],
)
def list_logical_data_model_comments(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[LogicalCommentResponse]:
    return LogicalDataModelService.list_comments(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/comments",
    response_model=LogicalCommentResponse,
)
def create_logical_data_model_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: LogicalCommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LogicalCommentResponse:
    return LogicalDataModelService.create_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )
