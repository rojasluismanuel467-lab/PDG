from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.inventory_matrix import (
    AddInventoryCommentRequest,
    InventoryMatrixResponse,
    InventoryMatrixSnapshotRequest,
)
from app.services.inventory_matrix_service import InventoryMatrixService

router = APIRouter(tags=["inventory-matrix"])


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/inventory-matrix",
    response_model=InventoryMatrixResponse,
)
def get_inventory_matrix(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InventoryMatrixResponse:
    return InventoryMatrixService.get_matrix(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/inventory-matrix",
    response_model=InventoryMatrixResponse,
)
def save_inventory_matrix(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: InventoryMatrixSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InventoryMatrixResponse:
    return InventoryMatrixService.upsert_matrix(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/inventory-matrix/generate",
    response_model=InventoryMatrixResponse,
)
def generate_inventory_matrix(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InventoryMatrixResponse:
    return InventoryMatrixService.generate_matrix(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/inventory-matrix/comments",
    response_model=InventoryMatrixResponse,
)
def add_inventory_matrix_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: AddInventoryCommentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InventoryMatrixResponse:
    return InventoryMatrixService.add_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        payload=payload,
    )
