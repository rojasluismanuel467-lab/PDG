from __future__ import annotations

import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.inventory_matrix import InventoryMatrix, InventoryMatrixVersion
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.user import User


class InventoryMatrixRepository:
    @staticmethod
    def get_project(db: Session, *, project_id: uuid.UUID) -> Project | None:
        stmt: Select[tuple[Project]] = select(Project).where(Project.id == project_id)
        return db.execute(stmt).scalar_one_or_none()

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
    def get_user(db: Session, *, user_id: uuid.UUID) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_matrix(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> InventoryMatrix | None:
        stmt: Select[tuple[InventoryMatrix]] = (
            select(InventoryMatrix)
            .options(selectinload(InventoryMatrix.versions))
            .where(
                InventoryMatrix.project_id == project_id,
                InventoryMatrix.artifact_id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_matrix(db: Session, *, model: InventoryMatrix) -> InventoryMatrix:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def create_version(
        db: Session,
        *,
        version: InventoryMatrixVersion,
    ) -> InventoryMatrixVersion:
        db.add(version)
        db.flush()
        db.refresh(version)
        return version
