from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, ProjectBlock, UserType
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.models.dfd_comment import DFDComment
from app.models.dfd_model import DFDModel
from app.models.dfd_version import DFDVersion
from app.repositories.dfd_repository import DFDRepository
from app.repositories.user_repository import UserRepository
from app.schemas.dfd import (
    DFDCommentCreateRequest,
    DFDCommentResponse,
    DFDFlowSchema,
    DFDModelResponse,
    DFDModelSnapshotRequest,
    DFDNodeSchema,
    DFDRestoreVersionRequest,
    DFDVersionPreviewResponse,
    DFDVersionResponse,
    DFDVersionsResponse,
)
from app.services.project_permission_service import ProjectPermissionService


class DFDService:
    AS_IS_ARTIFACT_CODE = "ASIS_DFD"
    TO_BE_ARTIFACT_CODE = "TOBE_DFD"
    SUPPORTED_ARTIFACT_CODES = {AS_IS_ARTIFACT_CODE, TO_BE_ARTIFACT_CODE}
    PROCESS_ID_PATTERN = re.compile(r"^\d+(\.\d+)*$")

    @staticmethod
    def _get_actor_name(db: Session, *, actor_user_id: uuid.UUID, fallback_email: str) -> str:
        user = UserRepository.get_by_id(db, user_id=actor_user_id)
        if user is not None and user.nombre:
            return user.nombre
        return fallback_email.split("@", maxsplit=1)[0]

    @staticmethod
    def _default_snapshot(*, artifact_code: str) -> dict:
        if artifact_code == DFDService.TO_BE_ARTIFACT_CODE:
            return {
                "name": "DFD TO-BE",
                "description": "Future-state Data Flow Diagram (TO-BE).",
                "level": 1,
                "nodos": [],
                "flujos": [],
            }
        return {
            "name": "DFD AS-IS",
            "description": "Current-state Data Flow Diagram (AS-IS).",
            "level": 1,
            "nodos": [],
            "flujos": [],
        }

    @classmethod
    def _validate_artifact_access(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ):
        artifact = DFDRepository.get_artifact(db, project_id=project_id, artifact_id=artifact_id)
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")
        if artifact.code not in cls.SUPPORTED_ARTIFACT_CODES:
            raise ValidationDomainError("This endpoint only supports DFD artifacts (AS-IS / TO-BE)")
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
    ) -> DFDModel:
        model = DFDRepository.get_model(db, project_id=project_id, artifact_id=artifact_id)
        if model is not None:
            return model

        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        snapshot = cls._default_snapshot(artifact_code=artifact.code)
        now = datetime.now(UTC)
        from sqlalchemy.exc import IntegrityError

        try:
            with db.begin_nested():
                model = DFDRepository.create_model(
                    db,
                    model=DFDModel(
                        project_id=project_id,
                        artifact_id=artifact_id,
                        phase=artifact.block.value
                        if isinstance(artifact.block, ProjectBlock)
                        else str(artifact.block),
                        name=snapshot["name"],
                        description=snapshot["description"],
                        level=snapshot["level"],
                        nodes=snapshot["nodos"],
                        flows=snapshot["flujos"],
                        current_version_number=1,
                        created_by_user_id=actor_user_id,
                        updated_by_user_id=actor_user_id,
                        last_saved_at=now,
                    ),
                )
                DFDRepository.create_version(
                    db,
                    version=DFDVersion(
                        model_id=model.id,
                        version_number=1,
                        snapshot=snapshot,
                        change_summary="Initial DFD model",
                        created_by_user_id=actor_user_id,
                        created_by_user_email=actor_user_email,
                    ),
                )
            db.commit()
        except IntegrityError:
            db.rollback()
            pass

        return DFDRepository.get_model(db, project_id=project_id, artifact_id=artifact_id) or model

    @staticmethod
    def _map_comment(comment: DFDComment) -> DFDCommentResponse:
        return DFDCommentResponse(
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
    def _map_version(version: DFDVersion) -> DFDVersionResponse:
        return DFDVersionResponse(
            id=version.id,
            version_number=version.version_number,
            created_at=version.created_at,
            created_by_user_id=version.created_by_user_id,
            created_by_user_email=version.created_by_user_email,
            change_summary=version.change_summary,
        )

    @classmethod
    def _map_model(cls, model: DFDModel) -> DFDModelResponse:
        versions = sorted(model.versions, key=lambda item: item.version_number, reverse=True)
        return DFDModelResponse(
            id=model.id,
            project_id=model.project_id,
            artifact_id=model.artifact_id,
            phase=model.phase,
            name=model.name,
            description=model.description,
            level=model.level,
            nodos=[DFDNodeSchema.model_validate(node) for node in model.nodes],
            flujos=[DFDFlowSchema.model_validate(flow) for flow in model.flows],
            comentarios=[cls._map_comment(comment) for comment in model.comments],
            version_actual=str(model.current_version_number),
            current_version_number=model.current_version_number,
            historial_versiones=[cls._map_version(version) for version in versions],
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_saved_at=model.last_saved_at,
        )

    @classmethod
    def _validate_snapshot_rules(cls, payload: DFDModelSnapshotRequest) -> None:
        node_ids = [node.id for node in payload.nodos]
        if len(node_ids) != len(set(node_ids)):
            raise ValidationDomainError("DFD nodes must have unique IDs")

        flow_ids = [flow.id for flow in payload.flujos]
        if len(flow_ids) != len(set(flow_ids)):
            raise ValidationDomainError("DFD flows must have unique IDs")

        process_nodes = [node for node in payload.nodos if node.tipo == "proceso"]
        data_store_nodes = [node for node in payload.nodos if node.tipo == "almacen"]

        for process in process_nodes:
            if not process.numero_proceso or not cls.PROCESS_ID_PATTERN.match(
                process.numero_proceso
            ):
                raise ValidationDomainError(
                    f"Process '{process.nombre}' requires a valid process ID "
                    "(e.g. 1, 1.1, 2)"
                )

        if payload.level == 0:
            if len(process_nodes) != 1:
                raise ValidationDomainError(
                    "Level 0 DFD must contain exactly one Process"
                )
            if data_store_nodes:
                raise ValidationDomainError(
                    "Level 0 DFD cannot contain Data Store nodes"
                )

        node_by_id = {node.id: node for node in payload.nodos}
        for flow in payload.flujos:
            source = node_by_id.get(flow.origen_id)
            target = node_by_id.get(flow.destino_id)
            if source is None or target is None:
                raise ValidationDomainError(
                    f"Flow '{flow.etiqueta}' references nodes that do not exist"
                )
            if source.id == target.id:
                raise ValidationDomainError(
                    f"Flow '{flow.etiqueta}' cannot connect a node to itself"
                )

            # Visual Paradigm DFD rule:
            # every data flow must begin or end at a Process.
            if source.tipo != "proceso" and target.tipo != "proceso":
                raise ValidationDomainError(
                    f"Invalid flow '{flow.etiqueta}': data flow must start or end at a Process"
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
    ) -> DFDModelResponse:
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
        return cls._map_model(model)

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
        payload: DFDModelSnapshotRequest,
    ) -> DFDModelResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        _, _, level = ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        if level < int(PermissionLevel.EDITAR):
            raise ForbiddenDomainError("Insufficient permission to edit DFD")
        if artifact.consultant_approved:
            raise ForbiddenDomainError("DFD artifact is approved and locked for edits")

        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        cls._validate_snapshot_rules(payload)
        model.name = payload.name
        model.description = payload.description
        model.level = payload.level
        model.nodes = [node.model_dump(mode="json") for node in payload.nodos]
        model.flows = [flow.model_dump(mode="json") for flow in payload.flujos]
        model.current_version_number += 1
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        DFDRepository.create_version(
            db,
            version=DFDVersion(
                model_id=model.id,
                version_number=model.current_version_number,
                snapshot={
                    "name": model.name,
                    "description": model.description,
                    "level": model.level,
                    "nodos": model.nodes,
                    "flujos": model.flows,
                },
                change_summary=payload.change_summary or "Manual update from DFD editor.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )

        db.commit()
        refreshed = DFDRepository.get_model(db, project_id=project_id, artifact_id=artifact_id)
        if refreshed is None:
            raise NotFoundDomainError("DFD model not found after save")
        return cls._map_model(refreshed)

    @classmethod
    def list_versions(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> DFDVersionsResponse:
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
        versions = DFDRepository.list_versions(db, model_id=model.id)
        db.commit()
        return DFDVersionsResponse(
            model_id=model.id,
            versions=[cls._map_version(version) for version in versions],
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
    ) -> DFDVersionPreviewResponse:
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
        version = DFDRepository.get_version(
            db,
            model_id=model.id,
            version_number=source_version_number,
        )
        if version is None:
            raise NotFoundDomainError("DFD source version not found")
        snapshot = DFDModelSnapshotRequest.model_validate(version.snapshot)
        return DFDVersionPreviewResponse(
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
        payload: DFDRestoreVersionRequest,
    ) -> DFDModelResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        if artifact.consultant_approved:
            raise ForbiddenDomainError("DFD artifact is approved and locked for edits")
        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        source = DFDRepository.get_version(
            db,
            model_id=model.id,
            version_number=payload.source_version_number,
        )
        if source is None:
            raise NotFoundDomainError("DFD source version not found")
        snapshot = DFDModelSnapshotRequest.model_validate(source.snapshot)
        cls._validate_snapshot_rules(snapshot)

        model.name = snapshot.name
        model.description = snapshot.description
        model.level = snapshot.level
        model.nodes = [node.model_dump(mode="json") for node in snapshot.nodos]
        model.flows = [flow.model_dump(mode="json") for flow in snapshot.flujos]
        model.current_version_number += 1
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        DFDRepository.create_version(
            db,
            version=DFDVersion(
                model_id=model.id,
                version_number=model.current_version_number,
                snapshot=snapshot.model_dump(mode="json", exclude={"change_summary"}),
                change_summary=payload.change_summary
                or f"Restored from DFD version v{payload.source_version_number}.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )

        db.commit()
        refreshed = DFDRepository.get_model(db, project_id=project_id, artifact_id=artifact_id)
        if refreshed is None:
            raise NotFoundDomainError("DFD model not found after restore")
        return cls._map_model(refreshed)

    @classmethod
    def list_comments(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> list[DFDCommentResponse]:
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
        comments = DFDRepository.list_comments(db, model_id=model.id)
        return [cls._map_comment(comment) for comment in comments]

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
        payload: DFDCommentCreateRequest,
    ) -> DFDCommentResponse:
        artifact = cls._validate_artifact_access(db, project_id=project_id, artifact_id=artifact_id)
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.COMENTAR,
        )
        if artifact.consultant_approved:
            raise ForbiddenDomainError("DFD artifact is approved and locked for comments")
        model = cls._ensure_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        target_client_id = payload.target_client_id
        if not target_client_id:
            raise ValidationDomainError("target_client_id is required for nodo/flujo comments")

        author_name = cls._get_actor_name(
            db,
            actor_user_id=actor_user_id,
            fallback_email=actor_user_email,
        )
        comment = DFDRepository.create_comment(
            db,
            comment=DFDComment(
                model_id=model.id,
                target_type=payload.target_type,
                target_client_id=target_client_id,
                content=payload.content.strip(),
                status="open",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
                created_by_user_name=author_name,
                created_by_user_type=actor_user_type.value,
                created_in_version_number=model.current_version_number,
            ),
        )
        db.commit()
        return cls._map_comment(comment)
