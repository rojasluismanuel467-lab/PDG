from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.conceptual_comment import ConceptualComment
from app.models.conceptual_entity import ConceptualEntity
from app.models.conceptual_model import ConceptualModel, ConceptualModelVersion
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_artifact_permission import ProjectArtifactPermission
from app.models.project_membership import ProjectMembership
from app.models.user import User


class ConceptualModelRepository:
    @staticmethod
    def get_project_by_id(db: Session, *, project_id: uuid.UUID) -> Project | None:
        stmt: Select[tuple[Project]] = select(Project).where(Project.id == project_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_membership(
        db: Session,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectMembership | None:
        stmt: Select[tuple[ProjectMembership]] = select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_artifact_by_id(
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
    def get_artifact_permission(
        db: Session,
        *,
        artifact_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ProjectArtifactPermission | None:
        stmt: Select[tuple[ProjectArtifactPermission]] = select(ProjectArtifactPermission).where(
            ProjectArtifactPermission.artifact_id == artifact_id,
            ProjectArtifactPermission.user_id == user_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_model_by_artifact(
        db: Session,
        *,
        artifact_id: uuid.UUID,
    ) -> ConceptualModel | None:
        stmt: Select[tuple[ConceptualModel]] = (
            select(ConceptualModel)
            .options(
                selectinload(ConceptualModel.entities).selectinload(ConceptualEntity.attributes),
                selectinload(ConceptualModel.relations),
                selectinload(ConceptualModel.versions),
                selectinload(ConceptualModel.comments),
            )
            .where(ConceptualModel.artifact_id == artifact_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_model_by_artifact_for_update(
        db: Session,
        *,
        artifact_id: uuid.UUID,
    ) -> ConceptualModel | None:
        stmt: Select[tuple[ConceptualModel]] = (
            select(ConceptualModel)
            .where(ConceptualModel.artifact_id == artifact_id)
            .with_for_update()
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_by_id(db: Session, *, user_id: uuid.UUID) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_model(db: Session, *, model: ConceptualModel) -> ConceptualModel:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def list_versions(
        db: Session,
        *,
        model_id: uuid.UUID,
    ) -> list[ConceptualModelVersion]:
        stmt: Select[tuple[ConceptualModelVersion]] = (
            select(ConceptualModelVersion)
            .where(ConceptualModelVersion.model_id == model_id)
            .order_by(ConceptualModelVersion.version_number.desc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def get_version_by_number(
        db: Session,
        *,
        model_id: uuid.UUID,
        version_number: int,
    ) -> ConceptualModelVersion | None:
        stmt: Select[tuple[ConceptualModelVersion]] = select(ConceptualModelVersion).where(
            ConceptualModelVersion.model_id == model_id,
            ConceptualModelVersion.version_number == version_number,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def replace_entities(
        db: Session,
        *,
        model: ConceptualModel,
        entities: Sequence[object],
    ) -> None:
        model.entities.clear()
        db.flush()
        model.entities.extend(list(entities))
        db.flush()

    @staticmethod
    def replace_relations(
        db: Session,
        *,
        model: ConceptualModel,
        relations: Sequence[object],
    ) -> None:
        model.relations.clear()
        db.flush()
        model.relations.extend(list(relations))
        db.flush()

    @staticmethod
    def create_version(
        db: Session,
        *,
        version: ConceptualModelVersion,
    ) -> ConceptualModelVersion:
        db.add(version)
        db.flush()
        return version

    @staticmethod
    def list_comments(
        db: Session,
        *,
        model_id: uuid.UUID,
    ) -> list[ConceptualComment]:
        stmt: Select[tuple[ConceptualComment]] = (
            select(ConceptualComment)
            .where(ConceptualComment.model_id == model_id)
            .order_by(ConceptualComment.created_at.asc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def create_comment(
        db: Session,
        *,
        comment: ConceptualComment,
    ) -> ConceptualComment:
        db.add(comment)
        db.flush()
        db.refresh(comment)
        return comment

    @staticmethod
    def get_comment_by_id(
        db: Session,
        *,
        model_id: uuid.UUID,
        comment_id: uuid.UUID,
    ) -> ConceptualComment | None:
        stmt: Select[tuple[ConceptualComment]] = select(ConceptualComment).where(
            ConceptualComment.model_id == model_id,
            ConceptualComment.id == comment_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def delete_comment(db: Session, *, comment: ConceptualComment) -> None:
        db.delete(comment)
        db.flush()
