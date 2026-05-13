from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, ProjectBlock, UserType
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.models.conceptual_attribute import ConceptualAttribute
from app.models.conceptual_comment import ConceptualComment
from app.models.conceptual_entity import ConceptualEntity
from app.models.conceptual_model import ConceptualModel, ConceptualModelVersion
from app.models.conceptual_relation import ConceptualRelation
from app.models.project_artifact import ProjectArtifact
from app.repositories.conceptual_model_repository import ConceptualModelRepository
from app.schemas.conceptual_model import (
    CARDINALITY_VALUES,
    COMMENT_STATUS_VALUES,
    COMMENT_TARGET_TYPES,
    ConceptualCommentCreateRequest,
    ConceptualCommentResponse,
    ConceptualCommentUpdateRequest,
    ConceptualModelCommentsResponse,
    ConceptualModelResponse,
    ConceptualModelRestoreVersionRequest,
    ConceptualModelUpsertRequest,
    ConceptualModelVersionItem,
    ConceptualModelVersionsResponse,
    ConceptualVersionPreviewResponse,
)

CONCEPTUAL_ARTIFACT_CODES = {"ASIS_CONCEPTUAL_DIAGRAM", "TOBE_CONCEPTUAL_DIAGRAM"}
CONCEPTUAL_ALLOWED_PHASES = {ProjectBlock.AS_IS, ProjectBlock.TO_BE}


class ConceptualModelService:
    @classmethod
    def _snapshot_to_upsert_request(
        cls,
        *,
        snapshot: dict[str, object],
        change_summary: str | None = None,
    ) -> ConceptualModelUpsertRequest:
        payload = {
            "name": snapshot.get("name", "Conceptual Diagram"),
            "description": snapshot.get("description", ""),
            "entities": snapshot.get("entities", []),
            "relations": snapshot.get("relations", []),
            "change_summary": change_summary,
        }
        return ConceptualModelUpsertRequest.model_validate(payload)

    @classmethod
    def _serialize_comment(cls, *, comment: ConceptualComment) -> ConceptualCommentResponse:
        return ConceptualCommentResponse(
            id=comment.id,
            model_id=comment.model_id,
            target_type=comment.target_type,
            target_client_id=comment.target_client_id,
            content=comment.content,
            status=comment.status,
            created_in_version_number=comment.created_in_version_number,
            outdated_at=comment.outdated_at,
            is_outdated=comment.outdated_at is not None,
            created_by_user_id=comment.created_by_user_id,
            created_by_user_email=comment.created_by_user_email,
            created_by_user_name=comment.created_by_user_name,
            created_by_user_type=comment.created_by_user_type.value,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        )

    @classmethod
    def _require_consultant_for_edit(cls, *, actor_user_type: UserType) -> None:
        if actor_user_type not in {UserType.CONSULTOR, UserType.ADMINISTRADOR}:
            raise ForbiddenDomainError("Only consultant users can edit conceptual diagrams")

    @classmethod
    def _resolve_artifact_or_raise(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> ProjectArtifact:
        artifact = ConceptualModelRepository.get_artifact_by_id(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
        )
        if artifact is None:
            raise NotFoundDomainError("Artifact not found in project")
        if artifact.code not in CONCEPTUAL_ARTIFACT_CODES:
            raise ValidationDomainError("Artifact is not a conceptual diagram")
        if artifact.block not in CONCEPTUAL_ALLOWED_PHASES:
            raise ValidationDomainError("Conceptual diagram supports only AS_IS and TO_BE blocks")
        return artifact

    @classmethod
    def _resolve_effective_permission(
        cls,
        db: Session,
        *,
        artifact: ProjectArtifact,
        actor_user_id: uuid.UUID,
        minimum_level: PermissionLevel,
    ) -> None:
        project = ConceptualModelRepository.get_project_by_id(db, project_id=artifact.project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")
        if project.manager_user_id == actor_user_id:
            return

        membership = ConceptualModelRepository.get_membership(
            db,
            project_id=artifact.project_id,
            user_id=actor_user_id,
        )
        if membership is None:
            raise ForbiddenDomainError("You are not a member of this project")

        artifact_permission = ConceptualModelRepository.get_artifact_permission(
            db,
            artifact_id=artifact.id,
            user_id=actor_user_id,
        )
        if artifact_permission is not None:
            current_level = int(artifact_permission.permission_level)
        elif artifact.block == ProjectBlock.AS_IS and membership.nivel_asis is not None:
            current_level = int(membership.nivel_asis)
        elif artifact.block == ProjectBlock.TO_BE and membership.nivel_tobe is not None:
            current_level = int(membership.nivel_tobe)
        elif membership.project_permission_level is not None:
            current_level = int(membership.project_permission_level)
        else:
            current_level = int(PermissionLevel.SIN_ACCESO)

        if current_level < int(minimum_level):
            raise ForbiddenDomainError(
                f"Insufficient permission for conceptual diagram: required {int(minimum_level)}, current {current_level}"
            )

    @classmethod
    def _default_name_for_artifact(cls, *, artifact: ProjectArtifact) -> str:
        return artifact.name

    @classmethod
    def _build_snapshot(cls, *, model: ConceptualModel) -> dict[str, object]:
        return {
            "name": model.name,
            "description": model.description,
            "entities": [
                {
                    "id": entity.client_id,
                    "name": entity.name,
                    "description": entity.description,
                    "position_x": entity.position_x,
                    "position_y": entity.position_y,
                    "color": entity.color,
                    "attributes": [
                        {
                            "id": attribute.client_id,
                            "name": attribute.name,
                            "data_type": attribute.data_type,
                            "is_pk": attribute.is_pk,
                            "is_fk": attribute.is_fk,
                            "is_nullable": attribute.is_nullable,
                            "description": attribute.description,
                            "fk_entity_ref": attribute.fk_entity_client_id,
                            "fk_attribute_ref": attribute.fk_attribute_ref,
                        }
                        for attribute in sorted(
                            entity.attributes, key=lambda item: item.order_index
                        )
                    ],
                }
                for entity in sorted(model.entities, key=lambda item: item.order_index)
            ],
            "relations": [
                {
                    "id": relation.client_id,
                    "name": relation.name,
                    "source_entity_id": relation.source_entity_client_id,
                    "target_entity_id": relation.target_entity_client_id,
                    "cardinality": relation.cardinality,
                    "description": relation.description,
                    "fk_attribute_id": relation.fk_attribute_client_id,
                }
                for relation in sorted(model.relations, key=lambda item: item.order_index)
            ],
        }

    @classmethod
    def _to_response(cls, *, model: ConceptualModel) -> ConceptualModelResponse:
        entities = [
            {
                "id": entity.client_id,
                "name": entity.name,
                "description": entity.description,
                "position_x": entity.position_x,
                "position_y": entity.position_y,
                "color": entity.color,
                "attributes": [
                    {
                        "id": attribute.client_id,
                        "name": attribute.name,
                        "data_type": attribute.data_type,
                        "is_pk": attribute.is_pk,
                        "is_fk": attribute.is_fk,
                        "is_nullable": attribute.is_nullable,
                        "description": attribute.description,
                        "fk_entity_ref": attribute.fk_entity_client_id,
                        "fk_attribute_ref": attribute.fk_attribute_ref,
                    }
                    for attribute in sorted(entity.attributes, key=lambda item: item.order_index)
                ],
            }
            for entity in sorted(model.entities, key=lambda item: item.order_index)
        ]
        relations = [
            {
                "id": relation.client_id,
                "name": relation.name,
                "source_entity_id": relation.source_entity_client_id,
                "target_entity_id": relation.target_entity_client_id,
                "cardinality": relation.cardinality,
                "description": relation.description,
                "fk_attribute_id": relation.fk_attribute_client_id,
            }
            for relation in sorted(model.relations, key=lambda item: item.order_index)
        ]
        comments = [
            cls._serialize_comment(comment=comment)
            for comment in sorted(model.comments, key=lambda item: item.created_at)
        ]

        return ConceptualModelResponse(
            id=model.id,
            project_id=model.project_id,
            artifact_id=model.artifact_id,
            phase=model.phase,
            name=model.name,
            description=model.description,
            entities=entities,
            relations=relations,
            comments=comments,
            current_version_number=model.current_version,
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_saved_at=model.last_saved_at,
        )

    @classmethod
    def _initialize_if_missing(
        cls,
        db: Session,
        *,
        artifact: ProjectArtifact,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> ConceptualModel:
        model = ConceptualModelRepository.get_model_by_artifact(db, artifact_id=artifact.id)
        if model is not None:
            return model

        try:
            with db.begin_nested():
                model = ConceptualModel(
                    project_id=artifact.project_id,
                    artifact_id=artifact.id,
                    phase=artifact.block,
                    name=cls._default_name_for_artifact(artifact=artifact),
                    description="",
                    current_version=1,
                    created_by_user_id=actor_user_id,
                    updated_by_user_id=actor_user_id,
                    last_saved_at=datetime.now(UTC),
                )
                model = ConceptualModelRepository.create_model(db, model=model)
                snapshot = cls._build_snapshot(model=model)
                ConceptualModelRepository.create_version(
                    db,
                    version=ConceptualModelVersion(
                        model_id=model.id,
                        version_number=1,
                        snapshot_json=snapshot,
                        change_summary="Initial empty conceptual model",
                        created_by_user_id=actor_user_id,
                        created_by_user_email=actor_user_email,
                    ),
                )
            db.commit()
        except IntegrityError:
            db.rollback()
        model = ConceptualModelRepository.get_model_by_artifact(db, artifact_id=artifact.id)
        assert model is not None
        return model

    @classmethod
    def get_model(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        actor_user_email: str,
    ) -> ConceptualModelResponse:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        return cls._to_response(model=model)

    @classmethod
    def _validate_payload(cls, *, payload: ConceptualModelUpsertRequest) -> None:
        entity_ids = [entity.id for entity in payload.entities]
        if len(entity_ids) != len(set(entity_ids)):
            raise ValidationDomainError("Entity ids must be unique in conceptual model payload")

        entity_set = set(entity_ids)
        attribute_index: dict[tuple[str, str], bool] = {}
        for entity in payload.entities:
            attribute_ids = [attribute.id for attribute in entity.attributes]
            if len(attribute_ids) != len(set(attribute_ids)):
                raise ValidationDomainError(
                    f"Attribute ids must be unique inside entity {entity.id}"
                )
            for attribute in entity.attributes:
                if attribute.fk_entity_ref and attribute.fk_entity_ref not in entity_set:
                    raise ValidationDomainError(
                        f"Attribute {attribute.id} references unknown fk_entity_ref {attribute.fk_entity_ref}"
                    )
                attribute_index[(entity.id, attribute.id)] = True

        relation_ids = [relation.id for relation in payload.relations]
        if len(relation_ids) != len(set(relation_ids)):
            raise ValidationDomainError("Relation ids must be unique in conceptual model payload")

        for relation in payload.relations:
            if relation.source_entity_id not in entity_set:
                raise ValidationDomainError(
                    f"Relation {relation.id} references unknown source entity {relation.source_entity_id}"
                )
            if relation.target_entity_id not in entity_set:
                raise ValidationDomainError(
                    f"Relation {relation.id} references unknown target entity {relation.target_entity_id}"
                )
            if relation.cardinality not in CARDINALITY_VALUES:
                raise ValidationDomainError(
                    f"Relation {relation.id} has invalid cardinality {relation.cardinality}"
                )
            if (
                relation.fk_attribute_id
                and (relation.source_entity_id, relation.fk_attribute_id) not in attribute_index
            ):
                raise ValidationDomainError(
                    f"Relation {relation.id} references unknown fk attribute {relation.fk_attribute_id} in source entity"
                )

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
        payload: ConceptualModelUpsertRequest,
    ) -> ConceptualModelResponse:
        cls._require_consultant_for_edit(actor_user_type=actor_user_type)
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.EDITAR,
        )
        cls._validate_payload(payload=payload)

        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        locked_model = ConceptualModelRepository.get_model_by_artifact_for_update(
            db, artifact_id=artifact.id
        )
        if locked_model is not None:
            model = locked_model
            db.refresh(model)

        entities: list[ConceptualEntity] = []
        for entity_index, entity in enumerate(payload.entities):
            model_entity = ConceptualEntity(
                model_id=model.id,
                client_id=entity.id,
                name=entity.name,
                description=entity.description,
                position_x=entity.position_x,
                position_y=entity.position_y,
                color=entity.color,
                order_index=entity_index,
            )
            model_entity.attributes = [
                ConceptualAttribute(
                    client_id=attribute.id,
                    name=attribute.name,
                    data_type=attribute.data_type,
                    is_pk=attribute.is_pk,
                    is_fk=attribute.is_fk,
                    is_nullable=attribute.is_nullable,
                    description=attribute.description,
                    fk_entity_client_id=attribute.fk_entity_ref,
                    fk_attribute_ref=attribute.fk_attribute_ref,
                    order_index=attribute_index,
                )
                for attribute_index, attribute in enumerate(entity.attributes)
            ]
            entities.append(model_entity)

        relations = [
            ConceptualRelation(
                model_id=model.id,
                client_id=relation.id,
                name=relation.name,
                source_entity_client_id=relation.source_entity_id,
                target_entity_client_id=relation.target_entity_id,
                cardinality=relation.cardinality,
                description=relation.description,
                fk_attribute_client_id=relation.fk_attribute_id,
                order_index=relation_index,
            )
            for relation_index, relation in enumerate(payload.relations)
        ]

        try:
            model.name = payload.name
            model.description = payload.description
            model.updated_by_user_id = actor_user_id
            model.last_saved_at = datetime.now(UTC)
            model.current_version = (model.current_version or 1) + 1

            current_entity_ids = {entity.id for entity in payload.entities}
            current_relation_ids = {relation.id for relation in payload.relations}

            ConceptualModelRepository.replace_entities(db, model=model, entities=entities)
            ConceptualModelRepository.replace_relations(db, model=model, relations=relations)
            cls._mark_outdated_comments_for_missing_targets(
                model=model,
                current_entity_ids=current_entity_ids,
                current_relation_ids=current_relation_ids,
            )
            snapshot = cls._build_snapshot(model=model)
            ConceptualModelRepository.create_version(
                db,
                version=ConceptualModelVersion(
                    model_id=model.id,
                    version_number=model.current_version,
                    snapshot_json=snapshot,
                    change_summary=payload.change_summary,
                    created_by_user_id=actor_user_id,
                    created_by_user_email=actor_user_email,
                ),
            )
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise ValidationDomainError(
                "Concurrent conceptual model update conflict. Please retry."
            ) from exc
        updated = ConceptualModelRepository.get_model_by_artifact(db, artifact_id=artifact.id)
        assert updated is not None
        return cls._to_response(model=updated)

    @classmethod
    def _mark_outdated_comments_for_missing_targets(
        cls,
        *,
        model: ConceptualModel,
        current_entity_ids: set[str],
        current_relation_ids: set[str],
    ) -> None:
        now = datetime.now(UTC)
        for comment in model.comments:
            if comment.target_type == "entity":
                if comment.target_client_id and comment.target_client_id not in current_entity_ids:
                    if comment.outdated_at is None:
                        comment.outdated_at = now
            elif comment.target_type == "relation":
                if (
                    comment.target_client_id
                    and comment.target_client_id not in current_relation_ids
                ):
                    if comment.outdated_at is None:
                        comment.outdated_at = now

    @classmethod
    def _validate_comment_target(
        cls,
        *,
        model: ConceptualModel,
        target_type: str,
        target_client_id: str | None,
    ) -> None:
        if target_type not in COMMENT_TARGET_TYPES:
            raise ValidationDomainError(f"Invalid comment target_type: {target_type}")
        if target_type == "general":
            if target_client_id is not None:
                raise ValidationDomainError("General comments must not include target_client_id")
            return

        if not target_client_id:
            raise ValidationDomainError(
                f"target_client_id is required for target_type={target_type}"
            )

        if target_type == "entity":
            entity_ids = {entity.client_id for entity in model.entities}
            if target_client_id not in entity_ids:
                raise ValidationDomainError(f"Unknown entity target_client_id: {target_client_id}")
            return

        relation_ids = {relation.client_id for relation in model.relations}
        if target_client_id not in relation_ids:
            raise ValidationDomainError(f"Unknown relation target_client_id: {target_client_id}")

    @classmethod
    def _can_manage_comment(
        cls,
        *,
        artifact: ProjectArtifact,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        comment: ConceptualComment,
        db: Session,
    ) -> bool:
        if comment.created_by_user_id == actor_user_id:
            return True
        if actor_user_type == UserType.ADMINISTRADOR:
            return True
        project = ConceptualModelRepository.get_project_by_id(db, project_id=artifact.project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")
        return project.manager_user_id == actor_user_id

    @classmethod
    def list_comments(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
        status: str | None = None,
        include_outdated: bool = True,
        only_active: bool = False,
    ) -> ConceptualModelCommentsResponse:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        comments = ConceptualModelRepository.list_comments(db, model_id=model.id)
        if only_active:
            comments = [
                comment
                for comment in comments
                if comment.status == "open" and comment.outdated_at is None
            ]
        else:
            if status is not None:
                if status not in COMMENT_STATUS_VALUES:
                    raise ValidationDomainError(f"Invalid comment status filter: {status}")
                comments = [comment for comment in comments if comment.status == status]
            if not include_outdated:
                comments = [comment for comment in comments if comment.outdated_at is None]
        return ConceptualModelCommentsResponse(
            model_id=model.id,
            comments=[cls._serialize_comment(comment=comment) for comment in comments],
        )

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
        payload: ConceptualCommentCreateRequest,
    ) -> ConceptualCommentResponse:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.COMENTAR,
        )
        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        cls._validate_comment_target(
            model=model,
            target_type=payload.target_type,
            target_client_id=payload.target_client_id,
        )
        content = payload.content.strip()
        if not content:
            raise ValidationDomainError("Comment content cannot be empty")
        user = ConceptualModelRepository.get_user_by_id(db, user_id=actor_user_id)
        if user is None:
            raise NotFoundDomainError("User not found")

        comment = ConceptualModelRepository.create_comment(
            db,
            comment=ConceptualComment(
                model_id=model.id,
                target_type=payload.target_type,
                target_client_id=payload.target_client_id,
                content=content,
                status="open",
                created_in_version_number=model.current_version or 1,
                outdated_at=None,
                created_by_user_id=actor_user_id,
                created_by_user_email=user.email,
                created_by_user_name=user.nombre,
                created_by_user_type=actor_user_type,
            ),
        )
        db.commit()
        return cls._serialize_comment(comment=comment)

    @classmethod
    def update_comment(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        comment_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        actor_user_email: str,
        payload: ConceptualCommentUpdateRequest,
    ) -> ConceptualCommentResponse:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.COMENTAR,
        )
        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        comment = ConceptualModelRepository.get_comment_by_id(
            db, model_id=model.id, comment_id=comment_id
        )
        if comment is None:
            raise NotFoundDomainError("Comment not found")
        if not cls._can_manage_comment(
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            comment=comment,
            db=db,
        ):
            raise ForbiddenDomainError("You cannot edit this comment")

        if payload.content is None and payload.status is None:
            raise ValidationDomainError("At least one field must be provided: content or status")
        if payload.content is not None:
            stripped = payload.content.strip()
            if not stripped:
                raise ValidationDomainError("Comment content cannot be empty")
            comment.content = stripped
        if payload.status is not None:
            if payload.status not in COMMENT_STATUS_VALUES:
                raise ValidationDomainError(f"Invalid comment status: {payload.status}")
            comment.status = payload.status
        db.commit()
        db.refresh(comment)
        return cls._serialize_comment(comment=comment)

    @classmethod
    def delete_comment(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        comment_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        actor_user_email: str,
    ) -> None:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.COMENTAR,
        )
        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        comment = ConceptualModelRepository.get_comment_by_id(
            db, model_id=model.id, comment_id=comment_id
        )
        if comment is None:
            raise NotFoundDomainError("Comment not found")
        if not cls._can_manage_comment(
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            comment=comment,
            db=db,
        ):
            raise ForbiddenDomainError("You cannot delete this comment")

        ConceptualModelRepository.delete_comment(db, comment=comment)
        db.commit()

    @classmethod
    def list_versions(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> ConceptualModelVersionsResponse:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = cls._initialize_if_missing(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )

        versions = ConceptualModelRepository.list_versions(db, model_id=model.id)
        return ConceptualModelVersionsResponse(
            model_id=model.id,
            versions=[
                ConceptualModelVersionItem(
                    id=version.id,
                    version_number=version.version_number,
                    created_at=version.created_at,
                    created_by_user_id=version.created_by_user_id,
                    created_by_user_email=version.created_by_user_email,
                    change_summary=version.change_summary,
                )
                for version in versions
            ],
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
    ) -> ConceptualVersionPreviewResponse:
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = ConceptualModelRepository.get_model_by_artifact(db, artifact_id=artifact.id)
        if model is None:
            raise NotFoundDomainError("Conceptual model not initialized")

        version = ConceptualModelRepository.get_version_by_number(
            db,
            model_id=model.id,
            version_number=source_version_number,
        )
        if version is None:
            raise NotFoundDomainError("Source version not found")

        return ConceptualVersionPreviewResponse(
            model_id=model.id,
            source_version_number=source_version_number,
            snapshot=cls._snapshot_to_upsert_request(snapshot=version.snapshot_json),
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
        payload: ConceptualModelRestoreVersionRequest,
    ) -> ConceptualModelResponse:
        cls._require_consultant_for_edit(actor_user_type=actor_user_type)
        artifact = cls._resolve_artifact_or_raise(
            db, project_id=project_id, artifact_id=artifact_id
        )
        cls._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.EDITAR,
        )
        model = ConceptualModelRepository.get_model_by_artifact(db, artifact_id=artifact.id)
        if model is None:
            raise NotFoundDomainError("Conceptual model not initialized")

        source_version = ConceptualModelRepository.get_version_by_number(
            db,
            model_id=model.id,
            version_number=payload.source_version_number,
        )
        if source_version is None:
            raise NotFoundDomainError("Source version not found")

        change_summary = payload.change_summary or (
            f"Restored from conceptual model version v{payload.source_version_number}."
        )
        restore_payload = cls._snapshot_to_upsert_request(
            snapshot=source_version.snapshot_json,
            change_summary=change_summary,
        )
        return cls.upsert_model(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            actor_user_email=actor_user_email,
            payload=restore_payload,
        )
