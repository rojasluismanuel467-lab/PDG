from __future__ import annotations

import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.conceptual_entity import ConceptualEntity
from app.models.conceptual_model import ConceptualModel
from app.models.dfd_model import DFDModel
from app.models.gap_analysis_report import GapAnalysisReport, GapAnalysisReportVersion
from app.models.gaps_crud_matrix import GapsCRUDMatrix, GapsCRUDMatrixVersion
from app.models.integration_quality_rules import (
    IntegrationQualityRules,
    IntegrationQualityRulesVersion,
)
from app.models.logical_data_model import LogicalDataModel
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.user import User


class BrechasRepository:
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
    def list_project_artifacts(
        db: Session,
        *,
        project_id: uuid.UUID,
    ) -> list[ProjectArtifact]:
        stmt: Select[tuple[ProjectArtifact]] = (
            select(ProjectArtifact)
            .where(ProjectArtifact.project_id == project_id)
            .order_by(ProjectArtifact.order_index.asc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def get_conceptual_model_by_artifact(
        db: Session,
        *,
        artifact_id: uuid.UUID,
    ) -> ConceptualModel | None:
        stmt: Select[tuple[ConceptualModel]] = (
            select(ConceptualModel)
            .options(
                selectinload(ConceptualModel.entities).selectinload(ConceptualEntity.attributes),
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
    def get_dfd_model_by_artifact(
        db: Session,
        *,
        artifact_id: uuid.UUID,
    ) -> DFDModel | None:
        stmt: Select[tuple[DFDModel]] = select(DFDModel).where(DFDModel.artifact_id == artifact_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_email(db: Session, *, user_id: uuid.UUID) -> str | None:
        stmt: Select[tuple[str]] = select(User.email).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_crud_matrix(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> GapsCRUDMatrix | None:
        stmt: Select[tuple[GapsCRUDMatrix]] = (
            select(GapsCRUDMatrix)
            .options(selectinload(GapsCRUDMatrix.versions))
            .where(
                GapsCRUDMatrix.project_id == project_id,
                GapsCRUDMatrix.artifact_id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_crud_matrix(db: Session, *, model: GapsCRUDMatrix) -> GapsCRUDMatrix:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def create_crud_matrix_version(
        db: Session,
        *,
        version: GapsCRUDMatrixVersion,
    ) -> GapsCRUDMatrixVersion:
        db.add(version)
        db.flush()
        db.refresh(version)
        return version

    @staticmethod
    def get_gap_report(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> GapAnalysisReport | None:
        stmt: Select[tuple[GapAnalysisReport]] = (
            select(GapAnalysisReport)
            .options(selectinload(GapAnalysisReport.versions))
            .where(
                GapAnalysisReport.project_id == project_id,
                GapAnalysisReport.artifact_id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_gap_report(db: Session, *, model: GapAnalysisReport) -> GapAnalysisReport:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def create_gap_report_version(
        db: Session,
        *,
        version: GapAnalysisReportVersion,
    ) -> GapAnalysisReportVersion:
        db.add(version)
        db.flush()
        db.refresh(version)
        return version

    @staticmethod
    def get_integration_rules(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> IntegrationQualityRules | None:
        stmt: Select[tuple[IntegrationQualityRules]] = (
            select(IntegrationQualityRules)
            .options(selectinload(IntegrationQualityRules.versions))
            .where(
                IntegrationQualityRules.project_id == project_id,
                IntegrationQualityRules.artifact_id == artifact_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_integration_rules(
        db: Session,
        *,
        model: IntegrationQualityRules,
    ) -> IntegrationQualityRules:
        db.add(model)
        db.flush()
        db.refresh(model)
        return model

    @staticmethod
    def create_integration_rules_version(
        db: Session,
        *,
        version: IntegrationQualityRulesVersion,
    ) -> IntegrationQualityRulesVersion:
        db.add(version)
        db.flush()
        db.refresh(version)
        return version
