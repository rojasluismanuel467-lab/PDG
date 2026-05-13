from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.conceptual_model import (
    ConceptualCommentCreateRequest,
    ConceptualCommentResponse,
    ConceptualCommentUpdateRequest,
    ConceptualModelCommentsResponse,
    ConceptualModelResponse,
    ConceptualModelRestoreVersionRequest,
    ConceptualModelUpsertRequest,
    ConceptualModelVersionsResponse,
    ConceptualVersionPreviewResponse,
)
from app.services.conceptual_model_service import ConceptualModelService

router = APIRouter(tags=["conceptual-model"])


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model",
    response_model=ConceptualModelResponse,
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual",
    response_model=ConceptualModelResponse,
    include_in_schema=False,
)
def get_conceptual_model(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualModelResponse:
    return ConceptualModelService.get_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model",
    response_model=ConceptualModelResponse,
)
@router.put(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual",
    response_model=ConceptualModelResponse,
    include_in_schema=False,
)
def upsert_conceptual_model(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ConceptualModelUpsertRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualModelResponse:
    return ConceptualModelService.upsert_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/versions",
    response_model=ConceptualModelVersionsResponse,
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/versiones",
    response_model=ConceptualModelVersionsResponse,
    include_in_schema=False,
)
def list_conceptual_model_versions(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualModelVersionsResponse:
    return ConceptualModelService.list_versions(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/versions/{version_number}/preview",
    response_model=ConceptualVersionPreviewResponse,
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/versiones/{version_number}/preview",
    response_model=ConceptualVersionPreviewResponse,
    include_in_schema=False,
)
def preview_conceptual_model_version(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualVersionPreviewResponse:
    return ConceptualModelService.preview_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        source_version_number=version_number,
        actor_user_id=current_user.id,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/restore-version",
    response_model=ConceptualModelResponse,
)
@router.post(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/restaurar-version",
    response_model=ConceptualModelResponse,
    include_in_schema=False,
)
def restore_conceptual_model_version(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ConceptualModelRestoreVersionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualModelResponse:
    return ConceptualModelService.restore_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/comments",
    response_model=ConceptualModelCommentsResponse,
)
@router.get(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/comentarios",
    response_model=ConceptualModelCommentsResponse,
    include_in_schema=False,
)
def list_conceptual_model_comments(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    status: str | None = Query(default=None),
    include_outdated: bool = Query(default=True),
    only_active: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualModelCommentsResponse:
    return ConceptualModelService.list_comments(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        status=status,
        include_outdated=include_outdated,
        only_active=only_active,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/comments",
    response_model=ConceptualCommentResponse,
)
@router.post(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/comentarios",
    response_model=ConceptualCommentResponse,
    include_in_schema=False,
)
def create_conceptual_model_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ConceptualCommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualCommentResponse:
    return ConceptualModelService.create_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.patch(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/comments/{comment_id}",
    response_model=ConceptualCommentResponse,
)
@router.patch(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/comentarios/{comment_id}",
    response_model=ConceptualCommentResponse,
    include_in_schema=False,
)
def update_conceptual_model_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    comment_id: uuid.UUID,
    payload: ConceptualCommentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ConceptualCommentResponse:
    return ConceptualModelService.update_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        comment_id=comment_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.delete(
    "/projects/{project_id}/artifacts/{artifact_id}/conceptual-model/comments/{comment_id}",
    status_code=204,
)
@router.delete(
    "/proyectos/{project_id}/entregables/{artifact_id}/modelo-conceptual/comentarios/{comment_id}",
    status_code=204,
    include_in_schema=False,
)
def delete_conceptual_model_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> None:
    ConceptualModelService.delete_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        comment_id=comment_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        actor_user_email=current_user.email,
    )
