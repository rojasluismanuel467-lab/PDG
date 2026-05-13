from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.core.enums import PermissionLevel, ProjectBlock, UserType
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.repositories.conceptual_model_repository import ConceptualModelRepository
from app.schemas.conceptual_model import (
    ConceptualModelRestoreVersionRequest,
    ConceptualModelUpsertRequest,
)
from app.services.conceptual_model_service import ConceptualModelService


def _valid_payload() -> ConceptualModelUpsertRequest:
    return ConceptualModelUpsertRequest.model_validate(
        {
            "name": "AS-IS Conceptual Diagram",
            "description": "Initial",
            "entities": [
                {
                    "id": "ent-customer",
                    "name": "Customer",
                    "description": "",
                    "position_x": 100,
                    "position_y": 120,
                    "attributes": [
                        {
                            "id": "attr-customer-id",
                            "name": "customer_id",
                            "data_type": "UUID",
                            "is_pk": True,
                            "is_fk": False,
                            "is_nullable": False,
                        },
                        {
                            "id": "attr-country-id",
                            "name": "country_id",
                            "data_type": "UUID",
                            "is_pk": False,
                            "is_fk": True,
                            "is_nullable": False,
                            "fk_entity_ref": "ent-country",
                            "fk_attribute_ref": "country_id",
                        },
                    ],
                },
                {
                    "id": "ent-country",
                    "name": "Country",
                    "description": "",
                    "position_x": 340,
                    "position_y": 120,
                    "attributes": [
                        {
                            "id": "attr-country-pk",
                            "name": "country_id",
                            "data_type": "UUID",
                            "is_pk": True,
                            "is_fk": False,
                            "is_nullable": False,
                        }
                    ],
                },
            ],
            "relations": [
                {
                    "id": "rel-customer-country",
                    "name": "customer_country",
                    "source_entity_id": "ent-customer",
                    "target_entity_id": "ent-country",
                    "cardinality": "N:1",
                    "fk_attribute_id": "attr-country-id",
                }
            ],
        }
    )


def test_require_consultant_for_edit_rejects_company() -> None:
    with pytest.raises(ForbiddenDomainError):
        ConceptualModelService._require_consultant_for_edit(actor_user_type=UserType.EMPRESA)


def test_validate_payload_accepts_valid_payload() -> None:
    ConceptualModelService._validate_payload(payload=_valid_payload())


def test_validate_payload_rejects_duplicate_entity_ids() -> None:
    payload = _valid_payload()
    payload.entities[1].id = payload.entities[0].id
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_payload(payload=payload)


def test_validate_payload_rejects_duplicate_attribute_ids_inside_entity() -> None:
    payload = _valid_payload()
    payload.entities[0].attributes[1].id = payload.entities[0].attributes[0].id
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_payload(payload=payload)


def test_validate_payload_rejects_unknown_fk_entity_reference() -> None:
    payload = _valid_payload()
    payload.entities[0].attributes[1].fk_entity_ref = "ent-unknown"
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_payload(payload=payload)


def test_validate_payload_rejects_relation_with_unknown_source_entity() -> None:
    payload = _valid_payload()
    payload.relations[0].source_entity_id = "ent-missing"
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_payload(payload=payload)


def test_validate_payload_rejects_relation_with_invalid_cardinality() -> None:
    payload = _valid_payload()
    payload.relations[0].cardinality = "2:N"
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_payload(payload=payload)


def test_validate_payload_rejects_relation_with_unknown_fk_attribute_id() -> None:
    payload = _valid_payload()
    payload.relations[0].fk_attribute_id = "attr-missing"
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_payload(payload=payload)


def test_resolve_effective_permission_allows_manager(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    artifact = SimpleNamespace(project_id=uuid.uuid4(), block=ProjectBlock.AS_IS, id=uuid.uuid4())
    project = SimpleNamespace(manager_user_id=actor_user_id)
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_project_by_id",
        staticmethod(lambda *_args, **_kwargs: project),
    )
    ConceptualModelService._resolve_effective_permission(
        db,
        artifact=artifact,
        actor_user_id=actor_user_id,
        minimum_level=PermissionLevel.EDITAR,
    )


def test_resolve_effective_permission_rejects_non_member(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    artifact = SimpleNamespace(project_id=uuid.uuid4(), block=ProjectBlock.AS_IS, id=uuid.uuid4())
    project = SimpleNamespace(manager_user_id=uuid.uuid4())
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_project_by_id",
        staticmethod(lambda *_args, **_kwargs: project),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "get_membership", staticmethod(lambda *_args, **_kwargs: None)
    )
    with pytest.raises(ForbiddenDomainError):
        ConceptualModelService._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.LECTURA,
        )


def test_resolve_effective_permission_uses_artifact_override_level(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    artifact = SimpleNamespace(project_id=uuid.uuid4(), block=ProjectBlock.AS_IS, id=uuid.uuid4())
    project = SimpleNamespace(manager_user_id=uuid.uuid4())
    membership = SimpleNamespace(nivel_asis=1, nivel_tobe=1, project_permission_level=1)
    artifact_permission = SimpleNamespace(permission_level=4)
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_project_by_id",
        staticmethod(lambda *_args, **_kwargs: project),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_membership",
        staticmethod(lambda *_args, **_kwargs: membership),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_artifact_permission",
        staticmethod(lambda *_args, **_kwargs: artifact_permission),
    )
    ConceptualModelService._resolve_effective_permission(
        db,
        artifact=artifact,
        actor_user_id=actor_user_id,
        minimum_level=PermissionLevel.APROBAR,
    )


def test_resolve_effective_permission_rejects_insufficient_level(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    artifact = SimpleNamespace(project_id=uuid.uuid4(), block=ProjectBlock.TO_BE, id=uuid.uuid4())
    project = SimpleNamespace(manager_user_id=uuid.uuid4())
    membership = SimpleNamespace(nivel_asis=5, nivel_tobe=1, project_permission_level=1)
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_project_by_id",
        staticmethod(lambda *_args, **_kwargs: project),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_membership",
        staticmethod(lambda *_args, **_kwargs: membership),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_artifact_permission",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    with pytest.raises(ForbiddenDomainError):
        ConceptualModelService._resolve_effective_permission(
            db,
            artifact=artifact,
            actor_user_id=actor_user_id,
            minimum_level=PermissionLevel.EDITAR,
        )


def test_mark_outdated_comments_for_missing_targets() -> None:
    comment_entity = SimpleNamespace(
        target_type="entity", target_client_id="ent-1", outdated_at=None
    )
    comment_relation = SimpleNamespace(
        target_type="relation", target_client_id="rel-1", outdated_at=None
    )
    model = SimpleNamespace(comments=[comment_entity, comment_relation])
    ConceptualModelService._mark_outdated_comments_for_missing_targets(
        model=model,
        current_entity_ids={"ent-2"},
        current_relation_ids={"rel-2"},
    )
    assert comment_entity.outdated_at is not None
    assert comment_relation.outdated_at is not None


def test_validate_comment_target_general_rejects_target_client_id() -> None:
    model = SimpleNamespace(entities=[], relations=[])
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_comment_target(
            model=model,
            target_type="general",
            target_client_id="unexpected",
        )


def test_validate_comment_target_entity_requires_existing_target() -> None:
    model = SimpleNamespace(entities=[SimpleNamespace(client_id="ent-a")], relations=[])
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_comment_target(
            model=model,
            target_type="entity",
            target_client_id="ent-b",
        )


def test_list_versions_initializes_model_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    initialized_model = SimpleNamespace(id=uuid.uuid4())
    version = SimpleNamespace(
        id=uuid.uuid4(),
        version_number=1,
        created_at=datetime.now(UTC),
        created_by_user_id=actor_user_id,
        created_by_user_email="consultor@acme.com",
        change_summary="Initial",
    )

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: initialized_model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "list_versions",
        staticmethod(lambda *_args, **_kwargs: [version]),
    )

    response = ConceptualModelService.list_versions(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=actor_user_id,
        actor_user_email="consultor@acme.com",
    )
    assert response.model_id == initialized_model.id
    assert len(response.versions) == 1


def test_preview_version_raises_when_source_version_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    model = SimpleNamespace(id=uuid.uuid4())
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_model_by_artifact",
        staticmethod(lambda *_args, **_kwargs: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_version_by_number",
        staticmethod(lambda *_args, **_kwargs: None),
    )

    with pytest.raises(NotFoundDomainError):
        ConceptualModelService.preview_version(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            source_version_number=99,
            actor_user_id=actor_user_id,
        )


def test_restore_version_uses_default_change_summary(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    model = SimpleNamespace(id=uuid.uuid4())
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="TOBE_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.TO_BE,
    )
    source_version = SimpleNamespace(
        snapshot_json={
            "name": "Restored Diagram",
            "description": "",
            "entities": [],
            "relations": [],
        }
    )
    captured_payload: dict[str, str | int] = {}

    def _capture_upsert(
        _db,
        *,
        project_id,
        artifact_id,
        actor_user_id,
        actor_user_type,
        actor_user_email,
        payload,
    ):
        captured_payload["change_summary"] = payload.change_summary or ""
        return "ok"

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_model_by_artifact",
        staticmethod(lambda *_args, **_kwargs: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_version_by_number",
        staticmethod(lambda *_args, **_kwargs: source_version),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "upsert_model",
        classmethod(lambda _cls, _db, **kwargs: _capture_upsert(_db, **kwargs)),
    )

    result = ConceptualModelService.restore_version(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        actor_user_email="consultor@acme.com",
        payload=ConceptualModelRestoreVersionRequest(source_version_number=3),
    )
    assert result == "ok"
    assert captured_payload["change_summary"] == "Restored from conceptual model version v3."


def test_resolve_artifact_or_raise_rejects_unknown_artifact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_artifact_by_id",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    with pytest.raises(NotFoundDomainError):
        ConceptualModelService._resolve_artifact_or_raise(
            SimpleNamespace(),
            project_id=uuid.uuid4(),
            artifact_id=uuid.uuid4(),
        )


def test_resolve_artifact_or_raise_rejects_non_conceptual_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    artifact = SimpleNamespace(code="ASIS_DFD", block=ProjectBlock.AS_IS)
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_artifact_by_id",
        staticmethod(lambda *_args, **_kwargs: artifact),
    )
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._resolve_artifact_or_raise(
            SimpleNamespace(),
            project_id=uuid.uuid4(),
            artifact_id=uuid.uuid4(),
        )


def test_resolve_artifact_or_raise_rejects_invalid_block(monkeypatch: pytest.MonkeyPatch) -> None:
    artifact = SimpleNamespace(code="ASIS_CONCEPTUAL_DIAGRAM", block=ProjectBlock.BRECHAS)
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_artifact_by_id",
        staticmethod(lambda *_args, **_kwargs: artifact),
    )
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._resolve_artifact_or_raise(
            SimpleNamespace(),
            project_id=uuid.uuid4(),
            artifact_id=uuid.uuid4(),
        )


def test_initialize_if_missing_returns_existing_model(monkeypatch: pytest.MonkeyPatch) -> None:
    model = SimpleNamespace(id=uuid.uuid4())
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_model_by_artifact",
        staticmethod(lambda *_args, **_kwargs: model),
    )
    result = ConceptualModelService._initialize_if_missing(
        SimpleNamespace(commit=lambda: None),
        artifact=SimpleNamespace(
            id=uuid.uuid4(), project_id=uuid.uuid4(), block=ProjectBlock.AS_IS, name="AS-IS"
        ),
        actor_user_id=uuid.uuid4(),
        actor_user_email="consultor@acme.com",
    )
    assert result is model


def test_upsert_model_success_updates_version_and_returns_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = SimpleNamespace(commit=lambda: None)
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    model = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=project_id,
        artifact_id=artifact_id,
        phase=ProjectBlock.AS_IS,
        name="Old",
        description="Old",
        entities=[],
        relations=[],
        comments=[],
        current_version=1,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        last_saved_at=None,
        updated_by_user_id=None,
    )
    payload = _valid_payload()

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )

    def _replace_entities(_db, *, model, entities):
        model.entities = list(entities)

    def _replace_relations(_db, *, model, relations):
        model.relations = list(relations)

    monkeypatch.setattr(
        ConceptualModelRepository, "replace_entities", staticmethod(_replace_entities)
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "replace_relations", staticmethod(_replace_relations)
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "create_version", staticmethod(lambda *_a, **_k: None)
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_model_by_artifact",
        staticmethod(lambda *_args, **_kwargs: model),
    )

    response = ConceptualModelService.upsert_model(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        actor_user_email="consultor@acme.com",
        payload=payload,
    )
    assert response.current_version_number == 2
    assert len(response.entities) == 2
    assert len(response.relations) == 1


def test_list_comments_only_active_filter(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    model = SimpleNamespace(id=uuid.uuid4())
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    comments = [
        SimpleNamespace(
            id=uuid.uuid4(),
            model_id=model.id,
            target_type="entity",
            target_client_id="ent-1",
            content="Open",
            status="open",
            created_in_version_number=1,
            outdated_at=None,
            created_by_user_id=actor_user_id,
            created_by_user_email="consultor@acme.com",
            created_by_user_name="Consultor",
            created_by_user_type=UserType.CONSULTOR,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        ),
        SimpleNamespace(
            id=uuid.uuid4(),
            model_id=model.id,
            target_type="entity",
            target_client_id="ent-1",
            content="Resolved",
            status="resolved",
            created_in_version_number=1,
            outdated_at=None,
            created_by_user_id=actor_user_id,
            created_by_user_email="consultor@acme.com",
            created_by_user_name="Consultor",
            created_by_user_type=UserType.CONSULTOR,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        ),
    ]

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "list_comments", staticmethod(lambda *_a, **_k: comments)
    )

    response = ConceptualModelService.list_comments(
        db,
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=actor_user_id,
        actor_user_email="consultor@acme.com",
        only_active=True,
    )
    assert len(response.comments) == 1
    assert response.comments[0].status == "open"


def test_create_comment_rejects_empty_content(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    model = SimpleNamespace(
        id=uuid.uuid4(),
        current_version=1,
        entities=[SimpleNamespace(client_id="ent-1")],
        relations=[],
    )
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )

    with pytest.raises(ValidationDomainError):
        ConceptualModelService.create_comment(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_type=UserType.CONSULTOR,
            actor_user_email="consultor@acme.com",
            payload=SimpleNamespace(target_type="entity", target_client_id="ent-1", content="   "),
        )


def test_update_comment_forbidden_when_actor_cannot_manage(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace(commit=lambda: None, refresh=lambda _obj: None)
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    model = SimpleNamespace(id=uuid.uuid4())
    artifact = SimpleNamespace(
        id=artifact_id,
        project_id=project_id,
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    comment = SimpleNamespace(
        id=uuid.uuid4(),
        model_id=model.id,
        target_type="entity",
        target_client_id="ent-1",
        content="Test",
        status="open",
        created_in_version_number=1,
        outdated_at=None,
        created_by_user_id=uuid.uuid4(),
        created_by_user_email="a@a.com",
        created_by_user_name="A",
        created_by_user_type=UserType.CONSULTOR,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_comment_by_id",
        staticmethod(lambda *_a, **_k: comment),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_can_manage_comment",
        classmethod(lambda _cls, **_kw: False),
    )

    with pytest.raises(ForbiddenDomainError):
        ConceptualModelService.update_comment(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            comment_id=comment.id,
            actor_user_id=actor_user_id,
            actor_user_type=UserType.CONSULTOR,
            actor_user_email="consultor@acme.com",
            payload=SimpleNamespace(content=None, status="resolved"),
        )


def test_resolve_effective_permission_raises_when_project_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_project_by_id",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    with pytest.raises(NotFoundDomainError):
        ConceptualModelService._resolve_effective_permission(
            SimpleNamespace(),
            artifact=SimpleNamespace(
                project_id=uuid.uuid4(), id=uuid.uuid4(), block=ProjectBlock.AS_IS
            ),
            actor_user_id=uuid.uuid4(),
            minimum_level=PermissionLevel.LECTURA,
        )


def test_initialize_if_missing_creates_model_and_initial_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = SimpleNamespace(commit=lambda: None)
    artifact = SimpleNamespace(
        id=uuid.uuid4(), project_id=uuid.uuid4(), block=ProjectBlock.AS_IS, name="AS-IS Name"
    )
    actor_user_id = uuid.uuid4()
    created = {"called": False}
    model_store = {"value": None}

    def _get_model(_db, *, artifact_id):
        return model_store["value"]

    def _create_model(_db, *, model):
        model.id = uuid.uuid4()
        model_store["value"] = model
        return model

    def _create_version(_db, *, version):
        created["called"] = True
        return version

    monkeypatch.setattr(
        ConceptualModelRepository, "get_model_by_artifact", staticmethod(_get_model)
    )
    monkeypatch.setattr(ConceptualModelRepository, "create_model", staticmethod(_create_model))
    monkeypatch.setattr(ConceptualModelRepository, "create_version", staticmethod(_create_version))

    result = ConceptualModelService._initialize_if_missing(
        db,
        artifact=artifact,
        actor_user_id=actor_user_id,
        actor_user_email="consultor@acme.com",
    )
    assert result.id is not None
    assert result.name == "AS-IS Name"
    assert created["called"] is True


def test_get_model_calls_init_and_response(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    model = SimpleNamespace(id=uuid.uuid4())
    expected = "response-ok"

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelService, "_to_response", classmethod(lambda _cls, *, model: expected)
    )

    result = ConceptualModelService.get_model(
        db,
        project_id=artifact.project_id,
        artifact_id=artifact.id,
        actor_user_id=uuid.uuid4(),
        actor_user_type=UserType.CONSULTOR,
        actor_user_email="consultor@acme.com",
    )
    assert result == expected


def test_validate_comment_target_invalid_type() -> None:
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_comment_target(
            model=SimpleNamespace(entities=[], relations=[]),
            target_type="invalid",
            target_client_id=None,
        )


def test_validate_comment_target_requires_target_id_for_entity() -> None:
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_comment_target(
            model=SimpleNamespace(entities=[SimpleNamespace(client_id="ent-1")], relations=[]),
            target_type="entity",
            target_client_id=None,
        )


def test_validate_comment_target_relation_unknown() -> None:
    with pytest.raises(ValidationDomainError):
        ConceptualModelService._validate_comment_target(
            model=SimpleNamespace(entities=[], relations=[SimpleNamespace(client_id="rel-1")]),
            target_type="relation",
            target_client_id="rel-2",
        )


def test_list_comments_rejects_invalid_status_filter(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace()
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    model = SimpleNamespace(id=uuid.uuid4())
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "list_comments", staticmethod(lambda *_a, **_k: [])
    )
    with pytest.raises(ValidationDomainError):
        ConceptualModelService.list_comments(
            db,
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            actor_user_id=uuid.uuid4(),
            actor_user_email="consultor@acme.com",
            status="bad-status",
        )


def test_create_comment_success(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace(commit=lambda: None)
    actor_user_id = uuid.uuid4()
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    model = SimpleNamespace(
        id=uuid.uuid4(),
        current_version=2,
        entities=[SimpleNamespace(client_id="ent-1")],
        relations=[],
    )

    def _create_comment(_db, *, comment):
        now = datetime.now(UTC)
        comment.id = uuid.uuid4()
        comment.created_at = now
        comment.updated_at = now
        return comment

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "get_user_by_id",
        staticmethod(
            lambda *_a, **_k: SimpleNamespace(email="consultor@acme.com", nombre="Consultor")
        ),
    )
    monkeypatch.setattr(ConceptualModelRepository, "create_comment", staticmethod(_create_comment))

    response = ConceptualModelService.create_comment(
        db,
        project_id=artifact.project_id,
        artifact_id=artifact.id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        actor_user_email="consultor@acme.com",
        payload=SimpleNamespace(
            target_type="entity", target_client_id="ent-1", content="Comentario válido"
        ),
    )
    assert response.content == "Comentario válido"
    assert response.created_by_user_name == "Consultor"


def test_create_comment_raises_when_user_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace(commit=lambda: None)
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    model = SimpleNamespace(
        id=uuid.uuid4(),
        current_version=1,
        entities=[SimpleNamespace(client_id="ent-1")],
        relations=[],
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "get_user_by_id", staticmethod(lambda *_a, **_k: None)
    )
    with pytest.raises(NotFoundDomainError):
        ConceptualModelService.create_comment(
            db,
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            actor_user_email="consultor@acme.com",
            payload=SimpleNamespace(target_type="entity", target_client_id="ent-1", content="Ok"),
        )


def test_delete_comment_success(monkeypatch: pytest.MonkeyPatch) -> None:
    db = SimpleNamespace(commit=lambda: None)
    actor_user_id = uuid.uuid4()
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    model = SimpleNamespace(id=uuid.uuid4())
    comment = SimpleNamespace(id=uuid.uuid4(), created_by_user_id=actor_user_id)
    deleted = {"ok": False}

    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_initialize_if_missing",
        classmethod(lambda _cls, _db, **_kw: model),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "get_comment_by_id", staticmethod(lambda *_a, **_k: comment)
    )
    monkeypatch.setattr(
        ConceptualModelService, "_can_manage_comment", classmethod(lambda _cls, **_kw: True)
    )
    monkeypatch.setattr(
        ConceptualModelRepository,
        "delete_comment",
        staticmethod(lambda *_a, **_k: deleted.update(ok=True)),
    )

    ConceptualModelService.delete_comment(
        db,
        project_id=artifact.project_id,
        artifact_id=artifact.id,
        comment_id=comment.id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        actor_user_email="consultor@acme.com",
    )
    assert deleted["ok"] is True


def test_preview_version_raises_when_model_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="ASIS_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.AS_IS,
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "get_model_by_artifact", staticmethod(lambda *_a, **_k: None)
    )
    with pytest.raises(NotFoundDomainError):
        ConceptualModelService.preview_version(
            SimpleNamespace(),
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            source_version_number=1,
            actor_user_id=uuid.uuid4(),
        )


def test_restore_version_raises_when_model_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    artifact = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="TOBE_CONCEPTUAL_DIAGRAM",
        block=ProjectBlock.TO_BE,
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_artifact_or_raise",
        classmethod(lambda _cls, _db, **_kw: artifact),
    )
    monkeypatch.setattr(
        ConceptualModelService,
        "_resolve_effective_permission",
        classmethod(lambda _cls, _db, **_kw: None),
    )
    monkeypatch.setattr(
        ConceptualModelRepository, "get_model_by_artifact", staticmethod(lambda *_a, **_k: None)
    )
    with pytest.raises(NotFoundDomainError):
        ConceptualModelService.restore_version(
            SimpleNamespace(),
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            actor_user_email="consultor@acme.com",
            payload=ConceptualModelRestoreVersionRequest(source_version_number=2),
        )
