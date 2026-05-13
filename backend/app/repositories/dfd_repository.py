from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.dfd_comment import DFDComment
from app.models.dfd_model import DFDModel
from app.models.dfd_version import DFDVersion
from app.models.project_artifact import ProjectArtifact


class DFDRepository:
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
    ) -> DFDModel | None:
        stmt: Select[tuple[DFDModel]] = (
            select(DFDModel)
            .options(
                selectinload(DFDModel.versions),
                selectinload(DFDModel.comments),
            )
            .where(
                DFDModel.project_id == project_id,
                DFDModel.artifact_id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_model(db: Session, *, model: DFDModel) -> DFDModel:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def create_version(db: Session, *, version: DFDVersion) -> DFDVersion:
        db.add(version)
        db.flush()
        db.refresh(version)
        return version

    @staticmethod
    def get_version(
        db: Session,
        *,
        model_id: uuid.UUID,
        version_number: int,
    ) -> DFDVersion | None:
        stmt: Select[tuple[DFDVersion]] = select(DFDVersion).where(
            DFDVersion.model_id == model_id,
            DFDVersion.version_number == version_number,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list_versions(
        db: Session,
        *,
        model_id: uuid.UUID,
    ) -> list[DFDVersion]:
        stmt: Select[tuple[DFDVersion]] = (
            select(DFDVersion)
            .where(DFDVersion.model_id == model_id)
            .order_by(DFDVersion.version_number.desc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def create_comment(db: Session, *, comment: DFDComment) -> DFDComment:
        db.add(comment)
        db.flush()
        db.refresh(comment)
        return comment

    @staticmethod
    def list_comments(
        db: Session,
        *,
        model_id: uuid.UUID,
    ) -> Sequence[DFDComment]:
        stmt: Select[tuple[DFDComment]] = (
            select(DFDComment)
            .where(DFDComment.model_id == model_id)
            .order_by(DFDComment.created_at.asc())
        )
        return db.execute(stmt).scalars().all()
