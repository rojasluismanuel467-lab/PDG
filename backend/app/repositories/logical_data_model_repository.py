from __future__ import annotations

import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.logical_data_model import LogicalDataModel
from app.models.logical_data_model_comment import LogicalDataModelComment
from app.models.logical_data_model_version import LogicalDataModelVersion
from app.models.project_artifact import ProjectArtifact


class LogicalDataModelRepository:
    @staticmethod
    def get_artifact(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> ProjectArtifact | None:
        stmt: Select[tuple[ProjectArtifact]] = select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.id == artifact_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_model(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> LogicalDataModel | None:
        stmt: Select[tuple[LogicalDataModel]] = select(LogicalDataModel).where(
            LogicalDataModel.project_id == project_id,
            LogicalDataModel.artifact_id == artifact_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_model(db: Session, *, model: LogicalDataModel) -> LogicalDataModel:
        db.add(model)
        db.flush()
        return model

    @staticmethod
    def list_versions(db: Session, *, model_id: uuid.UUID) -> list[LogicalDataModelVersion]:
        stmt: Select[tuple[LogicalDataModelVersion]] = (
            select(LogicalDataModelVersion)
            .where(LogicalDataModelVersion.model_id == model_id)
            .order_by(LogicalDataModelVersion.version_number.desc())
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_version(
        db: Session,
        *,
        model_id: uuid.UUID,
        version_number: int,
    ) -> LogicalDataModelVersion | None:
        stmt: Select[tuple[LogicalDataModelVersion]] = select(LogicalDataModelVersion).where(
            LogicalDataModelVersion.model_id == model_id,
            LogicalDataModelVersion.version_number == version_number,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_version(db: Session, *, version: LogicalDataModelVersion) -> LogicalDataModelVersion:
        db.add(version)
        db.flush()
        return version

    @staticmethod
    def list_comments(db: Session, *, model_id: uuid.UUID) -> list[LogicalDataModelComment]:
        stmt: Select[tuple[LogicalDataModelComment]] = (
            select(LogicalDataModelComment)
            .where(LogicalDataModelComment.model_id == model_id)
            .order_by(LogicalDataModelComment.created_at.asc())
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def create_comment(db: Session, *, comment: LogicalDataModelComment) -> LogicalDataModelComment:
        db.add(comment)
        db.flush()
        return comment
