from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, ProjectBlock, UserType
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.models.logical_data_model import LogicalDataModel
from app.models.logical_data_model_comment import LogicalDataModelComment
from app.models.logical_data_model_version import LogicalDataModelVersion
from app.repositories.logical_data_model_repository import LogicalDataModelRepository
from app.repositories.user_repository import UserRepository
from app.schemas.logical_data_model import (
    LogicalCommentCreateRequest,
    LogicalCommentResponse,
    LogicalDataModelResponse,
    LogicalModelSnapshotRequest,
    LogicalRestoreVersionRequest,
    LogicalTableSchema,
    LogicalVersionPreviewResponse,
    LogicalVersionResponse,
    LogicalVersionsResponse,
)
from app.services.project_permission_service import ProjectPermissionService


class LogicalDataModelService:
    SUPPORTED_ARTIFACT_CODES = {"TOBE_LOGICAL_DATA_MODEL", "ASIS_LOGICAL_DATA_MODEL"}

    @staticmethod
    def _get_actor_name(db: Session, *, actor_user_id: uuid.UUID, fallback_email: str) -> str:
        user = UserRepository.get_by_id(db, user_id=actor_user_id)
        if user is not None and user.nombre:
            return user.nombre
        return fallback_email.split("@", maxsplit=1)[0]

    @staticmethod
    def _default_model_payload(*, artifact_code: str) -> dict:
        if artifact_code == "ASIS_LOGICAL_DATA_MODEL":
            nombre = "AS-IS Logical Data Model"
            descripcion = "Current-state logical data model."
        else:
            nombre = "TO-BE Logical Data Model"
            descripcion = "Target-state logical data model."
        return {
            "nombre": nombre,
            "descripcion": descripcion,
            "tablas": [],
            "sql_ddl": "",
            "notas_markdown": "",
        }

    @classmethod
    def _validate_artifact_access(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ):
        artifact = LogicalDataModelRepository.get_artifact(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")
        if artifact.code not in cls.SUPPORTED_ARTIFACT_CODES:
            raise ValidationDomainError(
                "This endpoint only supports Logical Data Model artifacts"
            )
        return artifact

    @classmethod
    def _ensure_model(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> LogicalDataModel:
        model = LogicalDataModelRepository.get_model(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if model is not None:
            return model

        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        payload = cls._default_model_payload(artifact_code=artifact.code)
        now = datetime.now(UTC)
        from sqlalchemy.exc import IntegrityError

        try:
            with db.begin_nested():
                model = LogicalDataModelRepository.create_model(
                    db,
                    model=LogicalDataModel(
                        project_id=project_id,
                        artifact_id=artifact_id,
                        phase=artifact.block.value
                        if isinstance(artifact.block, ProjectBlock)
                        else str(artifact.block),
                        name=payload["nombre"],
                        description=payload["descripcion"],
                        tables=payload["tablas"],
                        sql_ddl=payload["sql_ddl"],
                        notes_markdown=payload["notas_markdown"],
                        comments=[],
                        current_version="v1.0",
                        versions=[],
                        created_by_user_id=actor_user_id,
                        updated_by_user_id=actor_user_id,
                        last_saved_at=now,
                    ),
                )
                LogicalDataModelRepository.create_version(
                    db,
                    version=LogicalDataModelVersion(
                        model_id=model.id,
                        version_number=1,
                        snapshot=payload,
                        change_summary="Initial logical data model",
                        created_by_user_id=actor_user_id,
                        created_by_user_email=actor_user_email,
                    ),
                )
            db.commit()
        except IntegrityError:
            db.rollback()
            model = LogicalDataModelRepository.get_model(
                db, project_id=project_id, artifact_id=artifact_id
            )
            if model is not None:
                return model
            raise

        return model

    @staticmethod
    def _map_comment(comment: LogicalDataModelComment) -> LogicalCommentResponse:
        return LogicalCommentResponse(
            id=comment.id,
            model_id=comment.model_id,
            target_type=comment.target_type,
            target_client_id=comment.target_client_id,
            content=comment.content,
            status=comment.status,
            created_by_user_id=comment.created_by_user_id,
            created_by_user_email=comment.created_by_user_email,
            created_by_user_name=comment.created_by_user_name,
            created_by_user_type=comment.created_by_user_type,
            created_in_version_number=comment.created_in_version_number,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        )

    @staticmethod
    def _map_version(version: LogicalDataModelVersion) -> LogicalVersionResponse:
        return LogicalVersionResponse(
            id=version.id,
            version_number=version.version_number,
            created_at=version.created_at,
            created_by_user_id=version.created_by_user_id,
            created_by_user_email=version.created_by_user_email,
            change_summary=version.change_summary,
        )

    @classmethod
    def _map_response(cls, db: Session, model: LogicalDataModel) -> LogicalDataModelResponse:
        versions = LogicalDataModelRepository.list_versions(db, model_id=model.id)
        comments = LogicalDataModelRepository.list_comments(db, model_id=model.id)
        current_version = model.current_version or "v1.0"
        current_version = current_version.removeprefix("v")
        current_version = current_version.removesuffix(".0")
        ui_versions = [
            {
                "version": str(item.version_number),
                "fecha": item.created_at.isoformat(),
                "autor": item.created_by_user_email,
                "descripcion_cambio": item.change_summary or "Logical model update.",
            }
            for item in versions
        ]
        return LogicalDataModelResponse(
            id=model.id,
            proyecto_id=model.project_id,
            entregable_id=model.artifact_id,
            fase=model.phase,
            nombre=model.name,
            descripcion=model.description,
            tablas=[LogicalTableSchema.model_validate(item) for item in model.tables],
            sql_ddl=model.sql_ddl,
            notas_markdown=model.notes_markdown,
            comentarios=[cls._map_comment(item) for item in comments],
            version_actual=current_version,
            versiones=ui_versions,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @classmethod
    def get_model(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> LogicalDataModelResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        db.commit()
        return cls._map_response(db, model)

    @classmethod
    def upsert_model(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        actor_user_email: str,
        payload: LogicalModelSnapshotRequest,
    ) -> LogicalDataModelResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        _, _, level = ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        if level < int(PermissionLevel.EDITAR):
            raise ForbiddenDomainError("Insufficient permission to edit logical model")
        if artifact.consultant_approved:
            raise ForbiddenDomainError("Logical model artifact is approved and locked for edits")

        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )

        versions = LogicalDataModelRepository.list_versions(db, model_id=model.id)
        next_version_number = max((item.version_number for item in versions), default=1) + 1

        model.name = payload.nombre
        model.description = payload.descripcion
        model.tables = [item.model_dump(mode="json") for item in payload.tablas]
        model.sql_ddl = payload.sql_ddl
        model.notes_markdown = payload.notas_markdown
        model.current_version = f"v{next_version_number}.0"
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        LogicalDataModelRepository.create_version(
            db,
            version=LogicalDataModelVersion(
                model_id=model.id,
                version_number=next_version_number,
                snapshot={
                    "nombre": model.name,
                    "descripcion": model.description,
                    "tablas": model.tables,
                    "sql_ddl": model.sql_ddl,
                    "notas_markdown": model.notes_markdown,
                },
                change_summary=payload.change_summary or "Manual update from logical model editor.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )

        db.commit()
        refreshed = LogicalDataModelRepository.get_model(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Logical model not found after save")
        return cls._map_response(db, refreshed)

    @classmethod
    def list_versions(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> LogicalVersionsResponse:
        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.LECTURA,
        )
        versions = LogicalDataModelRepository.list_versions(db, model_id=model.id)
        db.commit()
        return LogicalVersionsResponse(
            model_id=model.id,
            versions=[cls._map_version(item) for item in versions],
        )

    @classmethod
    def preview_version(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        source_version_number: int,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> LogicalVersionPreviewResponse:
        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.LECTURA,
        )
        version = LogicalDataModelRepository.get_version(
            db,
            model_id=model.id,
            version_number=source_version_number,
        )
        if version is None:
            raise NotFoundDomainError("Logical model source version not found")
        snapshot = LogicalModelSnapshotRequest.model_validate(version.snapshot)
        return LogicalVersionPreviewResponse(
            model_id=model.id,
            source_version_number=source_version_number,
            snapshot=snapshot,
        )

    @classmethod
    def restore_version(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        actor_user_email: str,
        payload: LogicalRestoreVersionRequest,
    ) -> LogicalDataModelResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        if artifact.consultant_approved:
            raise ForbiddenDomainError("Logical model artifact is approved and locked for edits")

        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        source = LogicalDataModelRepository.get_version(
            db,
            model_id=model.id,
            version_number=payload.source_version_number,
        )
        if source is None:
            raise NotFoundDomainError("Logical model source version not found")
        snapshot = LogicalModelSnapshotRequest.model_validate(source.snapshot)
        versions = LogicalDataModelRepository.list_versions(db, model_id=model.id)
        next_version_number = max((item.version_number for item in versions), default=1) + 1

        model.name = snapshot.nombre
        model.description = snapshot.descripcion
        model.tables = [item.model_dump(mode="json") for item in snapshot.tablas]
        model.sql_ddl = snapshot.sql_ddl
        model.notes_markdown = snapshot.notas_markdown
        model.current_version = f"v{next_version_number}.0"
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        LogicalDataModelRepository.create_version(
            db,
            version=LogicalDataModelVersion(
                model_id=model.id,
                version_number=next_version_number,
                snapshot=snapshot.model_dump(mode="json", exclude={"change_summary"}),
                change_summary=payload.change_summary
                or f"Restored from logical model version v{payload.source_version_number}.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )

        db.commit()
        refreshed = LogicalDataModelRepository.get_model(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Logical model not found after restore")
        return cls._map_response(db, refreshed)

    @classmethod
    def list_comments(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> list[LogicalCommentResponse]:
        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.LECTURA,
        )
        comments = LogicalDataModelRepository.list_comments(db, model_id=model.id)
        return [cls._map_comment(item) for item in comments]

    @classmethod
    def create_comment(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        actor_user_email: str,
        payload: LogicalCommentCreateRequest,
    ) -> LogicalCommentResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.COMENTAR,
        )
        if artifact.consultant_approved:
            raise ForbiddenDomainError("Logical model artifact is approved and locked for comments")

        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        table_ids = {item.get("id") for item in model.tables}
        column_ids = {
            column.get("id") for table in model.tables for column in table.get("columnas", [])
        }
        if payload.target_type == "tabla" and payload.target_client_id not in table_ids:
            raise ValidationDomainError("Referenced table was not found in current logical model")
        if payload.target_type == "columna" and payload.target_client_id not in column_ids:
            raise ValidationDomainError("Referenced column was not found in current logical model")

        versions = LogicalDataModelRepository.list_versions(db, model_id=model.id)
        latest_version_number = max((item.version_number for item in versions), default=1)
        author_name = cls._get_actor_name(
            db,
            actor_user_id=actor_user_id,
            fallback_email=actor_user_email,
        )
        comment = LogicalDataModelRepository.create_comment(
            db,
            comment=LogicalDataModelComment(
                model_id=model.id,
                target_type=payload.target_type,
                target_client_id=payload.target_client_id,
                content=payload.content.strip(),
                status="open",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
                created_by_user_name=author_name,
                created_by_user_type=actor_user_type.value,
                created_in_version_number=latest_version_number,
            ),
        )
        db.commit()
        return cls._map_comment(comment)
