from __future__ import annotations

import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.business_glossary import BusinessGlossary, BusinessGlossaryVersion
from app.models.conceptual_entity import ConceptualEntity
from app.models.conceptual_model import ConceptualModel
from app.models.logical_data_model import LogicalDataModel
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.user import User


class BusinessGlossaryRepository:
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
    def get_artifact_by_code(
        db: Session,
        *,
        project_id: uuid.UUID,
        code: str,
    ) -> ProjectArtifact | None:
        stmt: Select[tuple[ProjectArtifact]] = select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.code == code,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_conceptual_model_by_artifact(
        db: Session,
        *,
        artifact_id: uuid.UUID,
    ) -> ConceptualModel | None:
        stmt: Select[tuple[ConceptualModel]] = (
            select(ConceptualModel)
            .options(
                selectinload(ConceptualModel.entities).selectinload(ConceptualEntity.attributes)
            )
            .where(ConceptualModel.artifact_id == artifact_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_logical_model_by_artifact(
        db: Session,
        *,
        artifact_id: uuid.UUID,
    ) -> LogicalDataModel | None:
        stmt: Select[tuple[LogicalDataModel]] = select(LogicalDataModel).where(
            LogicalDataModel.artifact_id == artifact_id
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_glossary(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> BusinessGlossary | None:
        stmt: Select[tuple[BusinessGlossary]] = (
            select(BusinessGlossary)
            .options(selectinload(BusinessGlossary.versions))
            .where(
                BusinessGlossary.project_id == project_id,
                BusinessGlossary.artifact_id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_glossary(db: Session, *, model: BusinessGlossary) -> BusinessGlossary:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def create_version(
        db: Session,
        *,
        version: BusinessGlossaryVersion,
    ) -> BusinessGlossaryVersion:
        db.add(version)
        db.flush()
        db.refresh(version)
        return version
