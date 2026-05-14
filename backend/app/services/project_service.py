from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.artifact_catalog import ARTIFACT_CATALOG
from app.core.enums import PermissionLevel, ProjectArtifactStatus, ProjectStatus, UserType
from app.core.permissions import QUESTIONNAIRE_ARTIFACT_CODE
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.repositories.company_repository import CompanyRepository
from app.repositories.maturity_questionnaire_repository import MaturityQuestionnaireRepository
from app.repositories.project_membership_repository import ProjectMembershipRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import (
    ArtifactReviewRequest,
    CreateProjectRequest,
    ProjectArtifactResponse,
    ProjectArtifactsListResponse,
    ProjectArtifactSummary,
    ProjectCompanyResponse,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectManagerResponse,
    ProjectResponse,
    UpdateArtifactRequest,
    UpdateProjectRequest,
)
from app.services.maturity_questionnaire_service import MaturityQuestionnaireService
from app.services.project_permission_service import ProjectPermissionService


class ProjectService:
    @staticmethod
    def _ensure_project_creator_role(*, actor_user_type: UserType) -> None:
        if actor_user_type not in {UserType.ADMINISTRADOR, UserType.CONSULTOR}:
            raise ForbiddenDomainError("Only ADMINISTRADOR or CONSULTOR can create projects")

    @staticmethod
    def _artifact_summary(artifacts: list[ProjectArtifact]) -> ProjectArtifactSummary:
        total = len(artifacts)
        approved = sum(
            1 for artifact in artifacts if artifact.status == ProjectArtifactStatus.APPROVED
        )
        not_applicable = sum(
            1 for artifact in artifacts if artifact.status == ProjectArtifactStatus.NOT_APPLICABLE
        )
        return ProjectArtifactSummary(
            total=total,
            approved=approved,
            not_applicable=not_applicable,
        )

    @classmethod
    def _project_progress(cls, artifacts: list[ProjectArtifact]) -> int:
        applicable_artifacts = [artifact for artifact in artifacts if artifact.is_applicable]
        if not applicable_artifacts:
            return 100
        completed = sum(
            1
            for artifact in applicable_artifacts
            if artifact.status
            in {ProjectArtifactStatus.APPROVED, ProjectArtifactStatus.NOT_APPLICABLE}
        )
        return round((completed / len(applicable_artifacts)) * 100)

    @staticmethod
    def _clear_approval_state(artifact: ProjectArtifact) -> None:
        artifact.consultant_approved = False
        artifact.company_approved = False
        artifact.consultant_approved_at = None
        artifact.company_approved_at = None
        artifact.approved_at = None
        artifact.approved_by_user_id = None

    @classmethod
    def _ensure_reviewer_role(
        cls,
        *,
        reviewer: str,
        actor_user_type: UserType,
    ) -> None:
        if reviewer == "consultant":
            if actor_user_type not in {UserType.CONSULTOR, UserType.ADMINISTRADOR}:
                raise ForbiddenDomainError("Only CONSULTOR or ADMINISTRADOR can perform consultant review")
            return
        if reviewer == "company":
            if actor_user_type not in {UserType.EMPRESA, UserType.ADMINISTRADOR}:
                raise ForbiddenDomainError("Only EMPRESA or ADMINISTRADOR can perform company review")
            return
        raise ForbiddenDomainError("Unsupported reviewer type")

    @classmethod
    def _artifact_response(
        cls,
        *,
        artifact: ProjectArtifact,
        effective_permission_level: int,
    ) -> ProjectArtifactResponse:
        return ProjectArtifactResponse(
            id=artifact.id,
            code=artifact.code,
            name=artifact.name,
            description=artifact.description,
            block=artifact.block,
            order_index=artifact.order_index,
            block_order=artifact.block_order,
            status=artifact.status,
            is_applicable=artifact.is_applicable,
            consultant_approved=artifact.consultant_approved,
            company_approved=artifact.company_approved,
            consultant_approved_at=artifact.consultant_approved_at,
            company_approved_at=artifact.company_approved_at,
            approved_at=artifact.approved_at,
            approved_by_user_id=artifact.approved_by_user_id,
            review_cycles=artifact.review_cycles,
            last_rejection_reason=artifact.last_rejection_reason,
            effective_permission_level=effective_permission_level,
            created_at=artifact.created_at,
            updated_at=artifact.updated_at,
        )

    @classmethod
    def _project_response(cls, *, project: Project) -> ProjectResponse:
        artifacts = sorted(project.artifacts, key=lambda item: item.order_index)
        if project.company is not None:
            client_company = ProjectCompanyResponse(
                name=project.company.name,
                email=project.company.contact_email,
            )
        else:
            client_company = ProjectCompanyResponse(
                name=project.client_company_name,
                email=project.client_company_email,
            )
        return ProjectResponse(
            id=project.id,
            name=project.nombre,
            description=project.descripcion,
            client_company=client_company,
            estimated_end_date=project.estimated_end_date,
            status=project.estado,
            manager=ProjectManagerResponse(
                id=project.manager_user.id,
                name=project.manager_user.nombre,
            ),
            progress=cls._project_progress(artifacts),
            artifacts=cls._artifact_summary(artifacts),
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    @classmethod
    def create_project(
        cls,
        db: Session,
        *,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: CreateProjectRequest,
    ) -> ProjectDetailResponse:
        cls._ensure_project_creator_role(actor_user_type=actor_user_type)

        company = CompanyRepository.get_by_id(db, company_id=payload.company_id)
        if company is None:
            raise NotFoundDomainError("Company not found")

        project = Project(
            nombre=payload.name.strip(),
            descripcion=payload.description.strip() if payload.description else None,
            client_company_name=company.name,
            client_company_email=company.contact_email,
            company_id=company.id,
            estimated_end_date=payload.estimated_end_date,
            estado=ProjectStatus.ACTIVO,
            manager_user_id=actor_user_id,
        )
        project = ProjectRepository.create_project(db, project=project)
        ProjectRepository.create_manager_membership(
            db,
            project_id=project.id,
            user_id=actor_user_id,
        )

        empresa_users = CompanyRepository.get_empresa_users_by_company(
            db, company_id=company.id
        )
        for empresa_user in empresa_users:
            existing = ProjectMembershipRepository.get_membership(
                db, project_id=project.id, user_id=empresa_user.id
            )
            if existing is None:
                ProjectMembershipRepository.create_membership(
                    db,
                    project_id=project.id,
                    user_id=empresa_user.id,
                    is_manager=False,
                    project_permission_level=int(PermissionLevel.LECTURA),
                    nivel_asis=int(PermissionLevel.APROBAR),
                    nivel_tobe=int(PermissionLevel.APROBAR),
                    nivel_brechas=int(PermissionLevel.APROBAR),
                    nivel_roadmap=int(PermissionLevel.APROBAR),
                    assigned_by_user_id=actor_user_id,
                )

        artifacts = [
            ProjectArtifact(
                project_id=project.id,
                code=definition.code,
                name=definition.name,
                description=definition.description,
                block=definition.block,
                order_index=definition.order_index,
                block_order=definition.block_order,
                status=ProjectArtifactStatus.PENDING,
                is_applicable=True,
            )
            for definition in ARTIFACT_CATALOG
        ]
        ProjectRepository.create_artifacts(db, artifacts=artifacts)
        MaturityQuestionnaireService.initialize_default_questionnaire(
            db,
            project_id=project.id,
            created_by_user_id=actor_user_id,
        )

        ProjectRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project.id,
            tipo_accion="PROJECT_CREATED",
            descripcion=f"Project created: {project.nombre}",
            resource_id=project.id,
            datos_adicionales={"artifact_count": len(artifacts)},
        )

        db.commit()
        project = ProjectRepository.get_project_by_id(db, project_id=project.id)
        if project is None:
            raise NotFoundDomainError("Project not found after creation")

        _, membership, _ = ProjectPermissionService.resolve_project_level(
            db,
            project_id=project.id,
            actor_user_id=actor_user_id,
        )
        artifact_items = [
            cls._artifact_response(
                artifact=artifact,
                effective_permission_level=ProjectPermissionService.resolve_effective_level(
                    project=project,
                    membership=membership,
                    artifact=artifact,
                    artifact_level=None,
                    actor_user_type=actor_user_type,
                ),
            )
            for artifact in sorted(project.artifacts, key=lambda item: item.order_index)
        ]
        return ProjectDetailResponse(
            **cls._project_response(project=project).model_dump(),
            artifact_items=artifact_items,
        )

    @classmethod
    def list_projects(
        cls,
        db: Session,
        *,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
    ) -> ProjectListResponse:
        is_admin = actor_user_type == UserType.ADMINISTRADOR
        projects = ProjectRepository.list_projects_for_user(
            db, user_id=actor_user_id, is_admin=is_admin
        )
        items = [cls._project_response(project=project) for project in projects]
        return ProjectListResponse(total=len(items), items=items)

    @classmethod
    def get_project(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> ProjectDetailResponse:
        project, membership, _ = ProjectPermissionService.resolve_project_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.LECTURA,
        )
        artifact_items = [
            cls._artifact_response(
                artifact=artifact,
                effective_permission_level=ProjectPermissionService.resolve_artifact_level(
                    db,
                    project_id=project_id,
                    actor_user_id=actor_user_id,
                    artifact=artifact,
                )[2],
            )
            for artifact in sorted(project.artifacts, key=lambda item: item.order_index)
        ]
        return ProjectDetailResponse(
            **cls._project_response(project=project).model_dump(),
            artifact_items=artifact_items,
        )

    @classmethod
    def update_project(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: UpdateProjectRequest,
    ) -> ProjectDetailResponse:
        project, membership, level = ProjectPermissionService.resolve_project_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.EDITAR,
        )
        if (
            membership is not None
            and not membership.is_manager
            and level < int(PermissionLevel.EDITAR)
        ):
            raise ForbiddenDomainError("You do not have permission to update this project")

        if payload.name is not None:
            project.nombre = payload.name.strip()
        if payload.description is not None:
            project.descripcion = payload.description.strip() or None
        if payload.company_id is not None:
            company = CompanyRepository.get_by_id(db, company_id=payload.company_id)
            if company is None:
                raise NotFoundDomainError("Company not found")
            project.company_id = company.id
            project.client_company_name = company.name
            project.client_company_email = company.contact_email
        if payload.estimated_end_date is not None:
            project.estimated_end_date = payload.estimated_end_date
        if payload.status is not None:
            project.estado = payload.status

        ProjectRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project.id,
            tipo_accion="PROJECT_UPDATED",
            descripcion=f"Project updated: {project.nombre}",
            resource_id=project.id,
        )
        db.commit()
        db.refresh(project)
        return cls.get_project(db, project_id=project.id, actor_user_id=actor_user_id)

    @classmethod
    def list_project_artifacts(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> ProjectArtifactsListResponse:
        project = ProjectPermissionService.get_project_or_raise(db, project_id=project_id)
        if project.manager_user_id != actor_user_id:
            ProjectPermissionService.resolve_project_level(
                db,
                project_id=project_id,
                actor_user_id=actor_user_id,
                minimum_level=PermissionLevel.LECTURA,
            )

        artifacts = ProjectRepository.list_artifacts_by_project(db, project_id=project_id)
        items = [
            cls._artifact_response(
                artifact=artifact,
                effective_permission_level=ProjectPermissionService.resolve_artifact_level(
                    db,
                    project_id=project_id,
                    actor_user_id=actor_user_id,
                    artifact=artifact,
                )[2],
            )
            for artifact in artifacts
        ]
        return ProjectArtifactsListResponse(total=len(items), items=items)

    @classmethod
    def update_project_artifact(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: UpdateArtifactRequest,
    ) -> ProjectArtifactResponse:
        artifact = ProjectRepository.get_artifact_by_id(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
        )
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")

        project, membership, level = ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        if (
            membership is not None
            and not membership.is_manager
            and level < int(PermissionLevel.EDITAR)
        ):
            raise ForbiddenDomainError("You do not have permission to update this artifact")

        if payload.consultant_approved is not None or payload.company_approved is not None:
            raise ForbiddenDomainError("Direct approval flags are disabled. Use review endpoints.")

        if artifact.status == ProjectArtifactStatus.APPROVED:
            raise ForbiddenDomainError("Artifact is approved and cannot be modified")

        if payload.status in {
            ProjectArtifactStatus.APPROVED,
            ProjectArtifactStatus.PENDING_COMPANY_APPROVAL,
        }:
            raise ForbiddenDomainError("Use review endpoints to move artifact to approval states")

        if payload.is_applicable is not None:
            artifact.is_applicable = payload.is_applicable
            if payload.is_applicable is False:
                artifact.status = ProjectArtifactStatus.NOT_APPLICABLE
                cls._clear_approval_state(artifact)
            elif artifact.status == ProjectArtifactStatus.NOT_APPLICABLE:
                artifact.status = ProjectArtifactStatus.PENDING
                cls._clear_approval_state(artifact)

        if payload.status is not None:
            artifact.status = payload.status
            if payload.status == ProjectArtifactStatus.NOT_APPLICABLE:
                artifact.is_applicable = False
            elif (
                not artifact.is_applicable
                and payload.status != ProjectArtifactStatus.NOT_APPLICABLE
            ):
                artifact.is_applicable = True
            cls._clear_approval_state(artifact)

        if payload.last_rejection_reason is not None:
            artifact.last_rejection_reason = payload.last_rejection_reason.strip() or None

        ProjectRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project.id,
            tipo_accion="PROJECT_ARTIFACT_UPDATED",
            descripcion=f"Artifact updated: {artifact.code}",
            resource_id=artifact.id,
            datos_adicionales={
                "status": artifact.status.value,
                "is_applicable": artifact.is_applicable,
            },
        )
        db.commit()
        db.refresh(artifact)
        return cls._artifact_response(
            artifact=artifact,
            effective_permission_level=level,
        )

    @classmethod
    def _review_project_artifact(
        cls,
        db: Session,
        *,
        reviewer: str,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: ArtifactReviewRequest,
    ) -> ProjectArtifactResponse:
        cls._ensure_reviewer_role(reviewer=reviewer, actor_user_type=actor_user_type)

        artifact = ProjectRepository.get_artifact_by_id(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
        )
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")

        project, membership, level = ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.APROBAR,
        )
        if (
            membership is not None
            and not membership.is_manager
            and level < int(PermissionLevel.APROBAR)
        ):
            raise ForbiddenDomainError("You do not have permission to review this artifact")

        if artifact.is_applicable is False:
            raise ForbiddenDomainError("Artifact marked as NOT_APPLICABLE cannot be reviewed")

        now = datetime.now(UTC)

        if payload.approved:
            if reviewer == "consultant":
                artifact.consultant_approved = True
                artifact.consultant_approved_at = now
                artifact.last_rejection_reason = None
                # Single approval: consultant approval is enough to reach APPROVED status.
                artifact.status = ProjectArtifactStatus.APPROVED
                artifact.approved_at = now
                artifact.approved_by_user_id = actor_user_id
                if artifact.code == QUESTIONNAIRE_ARTIFACT_CODE:
                    questionnaire = MaturityQuestionnaireRepository.get_questionnaire(
                        db, project_id=project_id
                    )
                    if questionnaire is not None:
                        questionnaire.is_closed = True
                        questionnaire.closed_at = now
                        questionnaire.closed_by_user_id = actor_user_id
            else:
                artifact.company_approved = True
                artifact.company_approved_at = now
                artifact.last_rejection_reason = None
                if artifact.consultant_approved:
                    artifact.status = ProjectArtifactStatus.APPROVED
                    artifact.approved_at = now
                    artifact.approved_by_user_id = actor_user_id
                else:
                    artifact.status = ProjectArtifactStatus.IN_PROGRESS
                    artifact.approved_at = None
                    artifact.approved_by_user_id = None
        else:
            had_any_approval = artifact.consultant_approved or artifact.company_approved
            cls._clear_approval_state(artifact)
            artifact.status = ProjectArtifactStatus.IN_PROGRESS
            artifact.last_rejection_reason = payload.reason.strip() if payload.reason else None
            if had_any_approval:
                artifact.review_cycles += 1

        ProjectRepository.add_audit_log(
            db,
            user_id=actor_user_id,
            perfil_usuario=actor_user_type,
            project_id=project.id,
            tipo_accion=f"PROJECT_ARTIFACT_REVIEW_{reviewer.upper()}",
            descripcion=f"{reviewer} review updated for artifact: {artifact.code}",
            resource_id=artifact.id,
            datos_adicionales={
                "approved": payload.approved,
                "status": artifact.status.value,
                "reason": artifact.last_rejection_reason,
            },
        )
        db.commit()
        db.refresh(artifact)
        return cls._artifact_response(
            artifact=artifact,
            effective_permission_level=level,
        )

    @classmethod
    def review_project_artifact_consultant(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: ArtifactReviewRequest,
    ) -> ProjectArtifactResponse:
        return cls._review_project_artifact(
            db,
            reviewer="consultant",
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            payload=payload,
        )

    @classmethod
    def review_project_artifact_company(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: ArtifactReviewRequest,
    ) -> ProjectArtifactResponse:
        return cls._review_project_artifact(
            db,
            reviewer="company",
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            payload=payload,
        )
