from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.business_glossary import (
    AddGlossaryCommentRequest,
    BusinessGlossaryResponse,
    BusinessGlossarySnapshotRequest,
)
from app.services.business_glossary_service import BusinessGlossaryService

router = APIRouter(tags=["business-glossary"])


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/business-glossary",
    response_model=BusinessGlossaryResponse,
)
def get_business_glossary(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> BusinessGlossaryResponse:
    return BusinessGlossaryService.get_glossary(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/business-glossary",
    response_model=BusinessGlossaryResponse,
)
def save_business_glossary(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: BusinessGlossarySnapshotRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> BusinessGlossaryResponse:
    return BusinessGlossaryService.upsert_glossary(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/business-glossary/generate",
    response_model=BusinessGlossaryResponse,
)
def generate_business_glossary(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> BusinessGlossaryResponse:
    return BusinessGlossaryService.generate_glossary(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/business-glossary/comments",
    response_model=BusinessGlossaryResponse,
)
def add_business_glossary_comment(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: AddGlossaryCommentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> BusinessGlossaryResponse:
    return BusinessGlossaryService.add_comment(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        payload=payload,
    )
