import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.project import (
    ArtifactReviewRequest,
    CreateProjectRequest,
    ProjectArtifactResponse,
    ProjectArtifactsListResponse,
    ProjectDetailResponse,
    ProjectListResponse,
    UpdateArtifactRequest,
    UpdateProjectRequest,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: CreateProjectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectDetailResponse:
    return ProjectService.create_project(
        db,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.get("", response_model=ProjectListResponse)
def list_projects(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectListResponse:
    return ProjectService.list_projects(
        db,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectDetailResponse:
    print(f"[get_project] user={current_user.email} tipo={current_user.tipo_usuario!r} project={project_id}")
    return ProjectService.get_project(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
    )


@router.patch("/{project_id}", response_model=ProjectDetailResponse)
def update_project(
    project_id: uuid.UUID,
    payload: UpdateProjectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectDetailResponse:
    return ProjectService.update_project(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.get("/{project_id}/artifacts", response_model=ProjectArtifactsListResponse)
def list_project_artifacts(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectArtifactsListResponse:
    return ProjectService.list_project_artifacts(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
    )


@router.patch("/{project_id}/artifacts/{artifact_id}", response_model=ProjectArtifactResponse)
def update_project_artifact(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: UpdateArtifactRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectArtifactResponse:
    return ProjectService.update_project_artifact(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.post(
    "/{project_id}/artifacts/{artifact_id}/review/consultant",
    response_model=ProjectArtifactResponse,
)
def review_project_artifact_consultant(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ArtifactReviewRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectArtifactResponse:
    return ProjectService.review_project_artifact_consultant(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.post(
    "/{project_id}/artifacts/{artifact_id}/review/company",
    response_model=ProjectArtifactResponse,
)
def review_project_artifact_company(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    payload: ArtifactReviewRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectArtifactResponse:
    return ProjectService.review_project_artifact_company(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )
