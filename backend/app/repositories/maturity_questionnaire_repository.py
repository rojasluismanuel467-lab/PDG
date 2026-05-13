from __future__ import annotations

import uuid
from collections.abc import Sequence

from datetime import datetime

from sqlalchemy import Select, func, select, update
from sqlalchemy.orm import Session, selectinload

from app.models.maturity_answer import MaturityAnswer
from app.models.maturity_dimension import MaturityDimension
from app.models.maturity_question import MaturityQuestion
from app.models.maturity_questionnaire import MaturityQuestionnaire
from app.models.maturity_response import MaturityResponse
from app.models.maturity_subdomain import MaturitySubdomain
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_artifact_permission import ProjectArtifactPermission
from app.models.project_membership import ProjectMembership
from app.core.enums import MaturityResponseStatus, MaturityValidationStatus


class MaturityQuestionnaireRepository:
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
            ProjectMembership.project_id == project_id, ProjectMembership.user_id == user_id
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_artifact_by_code(
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_code: str,
    ) -> ProjectArtifact | None:
        stmt: Select[tuple[ProjectArtifact]] = select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.code == artifact_code,
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
    def list_dimensions(db: Session) -> list[MaturityDimension]:
        stmt: Select[tuple[MaturityDimension]] = (
            select(MaturityDimension)
            .options(selectinload(MaturityDimension.subdomains))
            .order_by(MaturityDimension.display_order.asc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def get_dimension_map(db: Session) -> dict[int, MaturityDimension]:
        dimensions = MaturityQuestionnaireRepository.list_dimensions(db)
        return {dimension.id: dimension for dimension in dimensions}

    @staticmethod
    def get_subdomain_map(db: Session) -> dict[int, MaturitySubdomain]:
        stmt: Select[tuple[MaturitySubdomain]] = select(MaturitySubdomain)
        return {subdomain.id: subdomain for subdomain in db.execute(stmt).scalars().all()}

    @staticmethod
    def get_questionnaire(db: Session, *, project_id: uuid.UUID) -> MaturityQuestionnaire | None:
        stmt: Select[tuple[MaturityQuestionnaire]] = (
            select(MaturityQuestionnaire)
            .options(
                selectinload(MaturityQuestionnaire.questions),
                selectinload(MaturityQuestionnaire.responses)
                .selectinload(MaturityResponse.answers)
                .selectinload(MaturityAnswer.question),
            )
            .where(MaturityQuestionnaire.project_id == project_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_questionnaire_by_code(
        db: Session,
        *,
        access_code: str,
    ) -> MaturityQuestionnaire | None:
        stmt: Select[tuple[MaturityQuestionnaire]] = (
            select(MaturityQuestionnaire)
            .options(
                selectinload(MaturityQuestionnaire.questions),
                selectinload(MaturityQuestionnaire.responses)
                .selectinload(MaturityResponse.answers)
                .selectinload(MaturityAnswer.question),
            )
            .where(MaturityQuestionnaire.access_code == access_code)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_questionnaire(
        db: Session,
        *,
        questionnaire: MaturityQuestionnaire,
    ) -> MaturityQuestionnaire:
        db.add(questionnaire)
        db.flush()
        db.refresh(questionnaire)
        return questionnaire

    @staticmethod
    def replace_questions(
        db: Session,
        *,
        questionnaire: MaturityQuestionnaire,
        questions: Sequence[MaturityQuestion],
    ) -> list[MaturityQuestion]:
        questionnaire.questions.clear()
        db.flush()
        questionnaire.questions.extend(list(questions))
        db.flush()
        return list(questionnaire.questions)

    @staticmethod
    def count_access_code(db: Session, *, access_code: str) -> int:
        stmt = (
            select(func.count())
            .select_from(MaturityQuestionnaire)
            .where(MaturityQuestionnaire.access_code == access_code)
        )
        return int(db.execute(stmt).scalar_one())

    @staticmethod
    def create_response(
        db: Session,
        *,
        response: MaturityResponse,
    ) -> MaturityResponse:
        db.add(response)
        db.flush()
        db.refresh(response)
        return response

    @staticmethod
    def create_answers(
        db: Session,
        *,
        answers: Sequence[MaturityAnswer],
    ) -> list[MaturityAnswer]:
        db.add_all(list(answers))
        db.flush()
        return list(answers)

    @staticmethod
    def get_response(db: Session, *, response_id: uuid.UUID) -> MaturityResponse | None:
        stmt: Select[tuple[MaturityResponse]] = (
            select(MaturityResponse)
            .options(
                selectinload(MaturityResponse.answers).selectinload(MaturityAnswer.question),
                selectinload(MaturityResponse.questionnaire).selectinload(
                    MaturityQuestionnaire.questions
                ),
            )
            .where(MaturityResponse.id == response_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_response_for_update(
        db: Session, *, response_id: uuid.UUID
    ) -> MaturityResponse | None:
        stmt: Select[tuple[MaturityResponse]] = (
            select(MaturityResponse)
            .options(
                selectinload(MaturityResponse.answers).selectinload(MaturityAnswer.question),
                selectinload(MaturityResponse.questionnaire).selectinload(
                    MaturityQuestionnaire.questions
                ),
            )
            .where(MaturityResponse.id == response_id)
            .with_for_update()
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def finalize_response_if_pending(
        db: Session,
        *,
        response_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        validated_at: datetime,
    ) -> bool:
        stmt = (
            update(MaturityResponse)
            .where(
                MaturityResponse.id == response_id,
                MaturityResponse.status != MaturityResponseStatus.ANULADA,
                MaturityResponse.estado_validacion != MaturityValidationStatus.APROBADA,
            )
            .values(
                estado_validacion=MaturityValidationStatus.APROBADA,
                validated_by_user_id=actor_user_id,
                validated_at=validated_at,
            )
        )
        result = db.execute(stmt)
        return (result.rowcount or 0) == 1
