from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.brechas import (
    CRUDMatrixResponse,
    CRUDMatrixSnapshotRequest,
    ExportDocumentRequest,
    GapAnalysisReportResponse,
    GapAnalysisReportSnapshotRequest,
    IntegrationQualityRulesResponse,
    IntegrationQualityRulesSnapshotRequest,
)
from app.services.brechas_service import BrechasService

router = APIRouter(tags=["brechas"])


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/crud-matrix",
    response_model=CRUDMatrixResponse,
)
def get_crud_matrix(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CRUDMatrixResponse:
    return BrechasService.get_crud_matrix(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/crud-matrix",
    response_model=CRUDMatrixResponse,
)
def save_crud_matrix(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: CRUDMatrixSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CRUDMatrixResponse:
    return BrechasService.upsert_crud_matrix(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/crud-matrix/generate",
    response_model=CRUDMatrixResponse,
)
def generate_crud_matrix(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CRUDMatrixResponse:
    return BrechasService.generate_crud_matrix(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/gap-analysis-report",
    response_model=GapAnalysisReportResponse,
)
def get_gap_analysis_report(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> GapAnalysisReportResponse:
    return BrechasService.get_gap_report(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/gap-analysis-report",
    response_model=GapAnalysisReportResponse,
)
def save_gap_analysis_report(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: GapAnalysisReportSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> GapAnalysisReportResponse:
    return BrechasService.upsert_gap_report(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/gap-analysis-report/generate",
    response_model=GapAnalysisReportResponse,
)
def generate_gap_analysis_report(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> GapAnalysisReportResponse:
    return BrechasService.generate_gap_report(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post("/projects/{project_id}/artifacts/{artifact_id}/gap-analysis-report/export")
def export_gap_analysis_report(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ExportDocumentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    content, mime_type, file_name = BrechasService.export_gap_report(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        export_format=payload.formato,
    )
    return Response(
        content=content,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


@router.get(
    "/projects/{project_id}/artifacts/{artifact_id}/integration-quality-rules",
    response_model=IntegrationQualityRulesResponse,
)
def get_integration_quality_rules(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> IntegrationQualityRulesResponse:
    return BrechasService.get_integration_rules(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.put(
    "/projects/{project_id}/artifacts/{artifact_id}/integration-quality-rules",
    response_model=IntegrationQualityRulesResponse,
)
def save_integration_quality_rules(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: IntegrationQualityRulesSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> IntegrationQualityRulesResponse:
    return BrechasService.upsert_integration_rules(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/artifacts/{artifact_id}/integration-quality-rules/generate",
    response_model=IntegrationQualityRulesResponse,
)
def generate_integration_quality_rules(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> IntegrationQualityRulesResponse:
    return BrechasService.generate_integration_rules(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
    )


@router.post("/projects/{project_id}/artifacts/{artifact_id}/integration-quality-rules/export")
def export_integration_quality_rules(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ExportDocumentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    content, mime_type, file_name = BrechasService.export_integration_rules(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_email=current_user.email,
        export_format=payload.formato,
    )
    return Response(
        content=content,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
