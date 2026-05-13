from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import UploadFile

from app.core.config import settings
from app.core.enums import (
    MaturityResponseStatus,
    MaturityValidationStatus,
    PermissionLevel,
    ProjectBlock,
    UserType,
)
from app.exceptions.domain import (
    ConflictDomainError,
    ForbiddenDomainError,
    NotFoundDomainError,
    ValidationDomainError,
)
from app.repositories.maturity_questionnaire_repository import MaturityQuestionnaireRepository
from app.schemas.maturity_questionnaire import (
    FinalizeEvaluationRequest,
    QuestionConfigRequest,
    QuestionnaireConfigUpsertRequest,
    RoleCatalogUpsertRequest,
    ScoreCriteriaItem,
    SubmitAnswerRequest,
    SubmitResponseRequest,
    UpdateQuestionnaireStatusRequest,
    ValidateAnswerRequest,
)
from app.services.maturity_questionnaire_service import MaturityQuestionnaireService


class _FakeDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1

    def flush(self) -> None:
        return None


def _criteria_0_5() -> list[ScoreCriteriaItem]:
    return [
        ScoreCriteriaItem(score=0, name="Inexistente", description="No existe evidencia"),
        ScoreCriteriaItem(score=1, name="Inicial", description="Existe de forma ad hoc"),
        ScoreCriteriaItem(score=2, name="Basico", description="Practica parcial y limitada"),
        ScoreCriteriaItem(score=3, name="Definido", description="Practica consistente"),
        ScoreCriteriaItem(score=4, name="Gestionado", description="Practica medida y gobernada"),
        ScoreCriteriaItem(score=5, name="Optimizado", description="Mejora continua"),
    ]


def _make_active_response(*, status=MaturityValidationStatus.PENDIENTE, anulated=False):
    question_id = uuid.uuid4()
    answer = SimpleNamespace(
        id=uuid.uuid4(),
        question_id=question_id,
        respondent_score=3,
        validated_score=3 if status == MaturityValidationStatus.APROBADA else None,
        estado_validacion=status,
        validation_comments=None,
        question=SimpleNamespace(text="Pregunta"),
        evidence_url=None,
        evidence_name=None,
        evidence_type=None,
        evidence_size=None,
        created_at=datetime.now(UTC),
    )
    return SimpleNamespace(
        id=uuid.uuid4(),
        questionnaire=SimpleNamespace(project_id=uuid.uuid4()),
        respondent_name="Luis",
        respondent_email="luis@example.com",
        role="cdo",
        answers=[answer],
        status=MaturityResponseStatus.ANULADA if anulated else MaturityResponseStatus.ACTIVE,
        anulation_reason="x" if anulated else None,
        anulated_at=datetime.now(UTC) if anulated else None,
        anulated_by_user_id=uuid.uuid4() if anulated else None,
        submitted_at=datetime.now(UTC),
        estado_validacion=status,
        validated_by_user_id=None,
        validated_at=None,
        validation_comments=None,
    )


def test_maturity_level_boundaries() -> None:
    assert MaturityQuestionnaireService._maturity_level(0) == "No evaluado"
    assert MaturityQuestionnaireService._maturity_level(1.0) == "Inicial"
    assert MaturityQuestionnaireService._maturity_level(2.0) == "Repetible"
    assert MaturityQuestionnaireService._maturity_level(3.0) == "Definido"
    assert MaturityQuestionnaireService._maturity_level(4.0) == "Gestionado"
    assert MaturityQuestionnaireService._maturity_level(4.8) == "Optimizado"


def test_dimension_weight_override_map_parses_valid_entries() -> None:
    questionnaire = SimpleNamespace(
        dimension_weights_override={"1": "2.5", "invalid": "x", "2": None, "3": -1, "4": 1}
    )
    result = MaturityQuestionnaireService._dimension_weight_override_map(
        questionnaire=questionnaire
    )
    assert result == {1: 2.5, 4: 1.0}


def test_generate_access_code_retries_until_available(monkeypatch) -> None:
    calls = {"n": 0}
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "count_access_code",
        staticmethod(
            lambda _db, access_code: (
                1 if calls.__setitem__("n", calls["n"] + 1) is None and calls["n"] == 1 else 0
            )
        ),
    )
    monkeypatch.setattr(
        "app.services.maturity_questionnaire_service.secrets.token_urlsafe",
        lambda _n: "abc123def456",
    )
    code = MaturityQuestionnaireService._generate_access_code(_FakeDb())
    assert code == "ABC123DEF456"
    assert calls["n"] >= 2


def test_score_criteria_overrides_and_sanitize() -> None:
    invalid_questionnaire = SimpleNamespace(
        score_criteria_override=[{"score": 0, "name": "A", "description": "short"}]
    )
    defaulted = MaturityQuestionnaireService._score_criteria_with_overrides(
        questionnaire=invalid_questionnaire
    )
    assert len(defaulted) == 6

    sanitized = MaturityQuestionnaireService._sanitize_score_criteria(_criteria_0_5())
    assert len(sanitized) == 6
    assert sanitized[0]["score"] == 0

    with pytest.raises(ValidationDomainError):
        MaturityQuestionnaireService._sanitize_score_criteria([_criteria_0_5()[0]])


def test_question_score_criteria_prefers_question_override() -> None:
    question = SimpleNamespace(
        score_criteria_override=[item.model_dump() for item in _criteria_0_5()]
    )
    questionnaire = SimpleNamespace(score_criteria_override=[])
    result = MaturityQuestionnaireService._question_score_criteria(
        question=question, questionnaire=questionnaire
    )
    assert len(result) == 6
    assert result[5].score == 5


def test_require_consultant_role_blocks_empresa() -> None:
    with pytest.raises(ForbiddenDomainError):
        MaturityQuestionnaireService._require_consultant_role(actor_user_type=UserType.EMPRESA)


def test_response_status_from_answers_matrix() -> None:
    assert (
        MaturityQuestionnaireService._response_status_from_answers([])
        == MaturityValidationStatus.PENDIENTE
    )
    approved = [SimpleNamespace(estado_validacion=MaturityValidationStatus.APROBADA)]
    rejected = [SimpleNamespace(estado_validacion=MaturityValidationStatus.RECHAZADA)]
    mixed = [
        SimpleNamespace(estado_validacion=MaturityValidationStatus.APROBADA),
        SimpleNamespace(estado_validacion=MaturityValidationStatus.RECHAZADA),
    ]
    assert (
        MaturityQuestionnaireService._response_status_from_answers(approved)
        == MaturityValidationStatus.APROBADA
    )
    assert (
        MaturityQuestionnaireService._response_status_from_answers(rejected)
        == MaturityValidationStatus.RECHAZADA
    )
    assert (
        MaturityQuestionnaireService._response_status_from_answers(mixed)
        == MaturityValidationStatus.EN_REVISION
    )


def test_build_question_model_success_and_invalid_role() -> None:
    payload = QuestionConfigRequest(
        dimension_id=1,
        subdomain_id=11,
        text="Existe una politica formal de datos?",
        applicable_roles=["cdo"],
        weight=1.0,
        score_criteria=_criteria_0_5(),
    )
    question = MaturityQuestionnaireService._build_question_model(
        questionnaire_id=uuid.uuid4(),
        payload=payload,
        dimension_ids={1},
        subdomain_dimension_map={11: 1},
        allowed_role_ids={"cdo"},
    )
    assert question.dimension_id == 1

    with pytest.raises(ValidationDomainError):
        MaturityQuestionnaireService._build_question_model(
            questionnaire_id=uuid.uuid4(),
            payload=payload,
            dimension_ids={1},
            subdomain_dimension_map={11: 1},
            allowed_role_ids={"data-owner"},
        )


def test_require_project_access_and_permission_resolution(monkeypatch) -> None:
    project_id = uuid.uuid4()
    actor_user_id = uuid.uuid4()
    project = SimpleNamespace(manager_user_id=uuid.uuid4())
    membership = SimpleNamespace(nivel_asis=None, project_permission_level=2)
    artifact = None

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_project_by_id",
        staticmethod(lambda _db, project_id: project),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_membership",
        staticmethod(lambda _db, project_id, user_id: membership),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_artifact_by_code",
        staticmethod(lambda _db, project_id, artifact_code: artifact),
    )
    MaturityQuestionnaireService._require_project_access(
        _FakeDb(),
        project_id=project_id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        minimum_level=PermissionLevel.LECTURA,
    )

    with pytest.raises(NotFoundDomainError):
        monkeypatch.setattr(
            MaturityQuestionnaireRepository,
            "get_project_by_id",
            staticmethod(lambda _db, project_id: None),
        )
        MaturityQuestionnaireService._require_project_access(
            _FakeDb(),
            project_id=project_id,
            actor_user_id=actor_user_id,
            actor_user_type=UserType.CONSULTOR,
            minimum_level=PermissionLevel.LECTURA,
        )


def test_initialize_default_questionnaire_creates_when_missing(monkeypatch) -> None:
    project_id = uuid.uuid4()
    created = SimpleNamespace(id=uuid.uuid4())

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "create_questionnaire",
        staticmethod(lambda _db, questionnaire: created),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "replace_questions",
        staticmethod(lambda _db, questionnaire, questions: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_generate_access_code",
        staticmethod(lambda _db: "ABCDEF123456"),
    )

    result = MaturityQuestionnaireService.initialize_default_questionnaire(
        _FakeDb(),
        project_id=project_id,
        created_by_user_id=uuid.uuid4(),
    )
    assert result.id == created.id


def test_get_config_initializes_when_missing(monkeypatch) -> None:
    db = _FakeDb()
    project_id = uuid.uuid4()
    questionnaire = SimpleNamespace(
        id=uuid.uuid4(),
        questions=[],
        responses=[],
        is_closed=False,
        access_code="ABC",
        access_expires_at=None,
        created_at=None,
        updated_at=None,
        custom_roles_override=[],
        score_criteria_override=[],
        dimension_weights_override={},
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    state = {"count": 0}

    def _get_q(_db, project_id):
        state["count"] += 1
        return None if state["count"] == 1 else questionnaire

    monkeypatch.setattr(MaturityQuestionnaireRepository, "get_questionnaire", staticmethod(_get_q))
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "initialize_default_questionnaire",
        staticmethod(lambda _db, project_id, created_by_user_id: questionnaire),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_catalog_dimensions",
        staticmethod(lambda _db, weight_overrides=None: []),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService, "_template_question_responses", staticmethod(lambda: [])
    )

    result = MaturityQuestionnaireService.get_config(
        db,
        project_id=project_id,
        actor_user_id=uuid.uuid4(),
        actor_user_type=UserType.CONSULTOR,
    )
    assert result.project_id == project_id
    assert db.commit_calls == 1


def test_upsert_config_success_and_validation(monkeypatch) -> None:
    db = _FakeDb()
    project_id = uuid.uuid4()
    questionnaire = SimpleNamespace(
        id=uuid.uuid4(),
        custom_roles_override=[],
        score_criteria_override=[],
        dimension_weights_override={},
        questions=[],
        responses=[],
        is_closed=False,
        access_code="XYZ",
        access_expires_at=None,
        created_at=None,
        updated_at=None,
    )
    payload = QuestionnaireConfigUpsertRequest(
        phase=ProjectBlock.AS_IS,
        questions=[
            QuestionConfigRequest(
                dimension_id=1,
                subdomain_id=11,
                text="Existe una estrategia formal de gobernanza de datos?",
                applicable_roles=["cdo"],
                weight=1.0,
                score_criteria=_criteria_0_5(),
            )
        ],
        dimension_weights={1: 2.0},
        roles=[RoleCatalogUpsertRequest(id="cdo", name="CDO", description="Chief Data Officer")],
        score_criteria=_criteria_0_5(),
    )

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_consultant_role",
        staticmethod(lambda **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: questionnaire),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_dimension_map",
        staticmethod(lambda _db: {1: object()}),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_subdomain_map",
        staticmethod(lambda _db: {11: SimpleNamespace(dimension_id=1)}),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "replace_questions",
        staticmethod(lambda _db, questionnaire, questions: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_catalog_dimensions",
        staticmethod(lambda _db, weight_overrides=None: []),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService, "_template_question_responses", staticmethod(lambda: [])
    )

    result = MaturityQuestionnaireService.upsert_config(
        db,
        project_id=project_id,
        actor_user_id=uuid.uuid4(),
        actor_user_type=UserType.CONSULTOR,
        payload=payload,
    )
    assert result.project_id == project_id
    assert db.commit_calls == 1

    invalid_payload = QuestionnaireConfigUpsertRequest(
        phase=ProjectBlock.AS_IS,
        questions=payload.questions,
        dimension_weights={999: 1.0},
    )
    with pytest.raises(ValidationDomainError):
        MaturityQuestionnaireService.upsert_config(
            db,
            project_id=project_id,
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=invalid_payload,
        )


def test_update_status_success_and_not_found(monkeypatch) -> None:
    db = _FakeDb()
    project_id = uuid.uuid4()
    questionnaire = SimpleNamespace(
        is_closed=False, updated_at=datetime.now(UTC), closed_at=None, closed_by_user_id=None
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_consultant_role",
        staticmethod(lambda **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: questionnaire),
    )
    result = MaturityQuestionnaireService.update_status(
        db,
        project_id=project_id,
        actor_user_id=uuid.uuid4(),
        actor_user_type=UserType.CONSULTOR,
        payload=UpdateQuestionnaireStatusRequest(is_closed=True),
    )
    assert result.is_closed is True

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: None),
    )
    with pytest.raises(NotFoundDomainError):
        MaturityQuestionnaireService.update_status(
            db,
            project_id=project_id,
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=UpdateQuestionnaireStatusRequest(is_closed=True),
        )


def test_validate_public_access_invalid_expired_closed(monkeypatch) -> None:
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire_by_code",
        staticmethod(lambda _db, access_code: None),
    )
    invalid = MaturityQuestionnaireService.validate_public_access(_FakeDb(), access_code="BAD")
    assert invalid.valid is False

    expired_q = SimpleNamespace(
        access_expires_at=datetime.now(UTC) - timedelta(days=1),
        project_id=uuid.uuid4(),
        is_closed=False,
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire_by_code",
        staticmethod(lambda _db, access_code: expired_q),
    )
    expired = MaturityQuestionnaireService.validate_public_access(_FakeDb(), access_code="EXP")
    assert expired.valid is False


def test_submit_response_success_and_duplicate(monkeypatch) -> None:
    db = _FakeDb()
    project_id = uuid.uuid4()
    question_id = uuid.uuid4()
    question = SimpleNamespace(id=question_id, is_active=True, applicable_roles=["cdo"])
    questionnaire = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=project_id,
        is_closed=False,
        access_expires_at=datetime.now(UTC) + timedelta(days=1),
        questions=[question],
        responses=[],
    )
    payload = SubmitResponseRequest(
        respondent_name="Luis",
        respondent_email="luis@example.com",
        role="cdo",
        answers=[
            SubmitAnswerRequest(
                question_id=question_id,
                score=4,
                evidencia_url="http://example.com/x.pdf",
                evidencia_nombre="x.pdf",
                evidencia_tipo="application/pdf",
                evidencia_size=20,
            )
        ],
    )
    created_response = SimpleNamespace(id=uuid.uuid4())
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire_by_code",
        staticmethod(lambda _db, access_code: questionnaire),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "create_response",
        staticmethod(lambda _db, response: created_response),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository, "create_answers", staticmethod(lambda _db, answers: None)
    )

    result = MaturityQuestionnaireService.submit_response(
        db,
        project_id=project_id,
        access_code="GOOD",
        payload=payload,
    )
    assert result.id == created_response.id
    assert db.commit_calls == 1

    questionnaire.responses = [SimpleNamespace(respondent_email="luis@example.com")]
    with pytest.raises(ConflictDomainError):
        MaturityQuestionnaireService.submit_response(
            db,
            project_id=project_id,
            access_code="GOOD",
            payload=payload,
        )


def test_list_responses_empty_and_filtered(monkeypatch) -> None:
    project_id = uuid.uuid4()
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: None),
    )
    empty = MaturityQuestionnaireService.list_responses(
        _FakeDb(),
        project_id=project_id,
        actor_user_id=uuid.uuid4(),
        actor_user_type=UserType.CONSULTOR,
        status=None,
    )
    assert empty.total == 0

    active = _make_active_response(status=MaturityValidationStatus.PENDIENTE)
    annulled = _make_active_response(status=MaturityValidationStatus.APROBADA, anulated=True)
    questionnaire = SimpleNamespace(responses=[active, annulled])
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: questionnaire),
    )
    only_active = MaturityQuestionnaireService.list_responses(
        _FakeDb(),
        project_id=project_id,
        actor_user_id=uuid.uuid4(),
        actor_user_type=UserType.CONSULTOR,
        status=MaturityResponseStatus.ACTIVE,
    )
    assert only_active.total == 1


def test_anular_reactivar_validate_finalize_error_paths(monkeypatch) -> None:
    db = _FakeDb()
    response = _make_active_response(status=MaturityValidationStatus.APROBADA)
    response.questionnaire = SimpleNamespace(project_id=uuid.uuid4())
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_consultant_role",
        staticmethod(lambda **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )

    monkeypatch.setattr(
        MaturityQuestionnaireRepository, "get_response", staticmethod(lambda _db, response_id: None)
    )
    with pytest.raises(NotFoundDomainError):
        MaturityQuestionnaireService.anular_response(
            db,
            response_id=uuid.uuid4(),
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=SimpleNamespace(reason="x"),
        )

    response_an = _make_active_response(status=MaturityValidationStatus.PENDIENTE, anulated=True)
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response",
        staticmethod(lambda _db, response_id: response_an),
    )
    with pytest.raises(ConflictDomainError):
        MaturityQuestionnaireService.anular_response(
            db,
            response_id=uuid.uuid4(),
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=SimpleNamespace(reason="x"),
        )

    response_not_an = _make_active_response(
        status=MaturityValidationStatus.PENDIENTE, anulated=False
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response",
        staticmethod(lambda _db, response_id: response_not_an),
    )
    with pytest.raises(ConflictDomainError):
        MaturityQuestionnaireService.reactivar_response(
            db,
            response_id=uuid.uuid4(),
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
        )

    response_finalized = _make_active_response(status=MaturityValidationStatus.APROBADA)
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response",
        staticmethod(lambda _db, response_id: response_finalized),
    )
    with pytest.raises(ConflictDomainError):
        MaturityQuestionnaireService.validate_answer(
            db,
            response_id=uuid.uuid4(),
            answer_id=response_finalized.answers[0].id,
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=ValidateAnswerRequest(validated_score=2, validacion_comentarios=None),
        )

    response_annulled = _make_active_response(
        status=MaturityValidationStatus.PENDIENTE, anulated=True
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response",
        staticmethod(lambda _db, response_id: response_annulled),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response_for_update",
        staticmethod(lambda _db, response_id: response_annulled),
    )
    with pytest.raises(ConflictDomainError):
        MaturityQuestionnaireService.finalize_response_evaluation(
            db,
            response_id=uuid.uuid4(),
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=FinalizeEvaluationRequest(confirmation=True),
        )


def test_get_results_uses_only_approved_responses(monkeypatch) -> None:
    project_id = uuid.uuid4()
    actor_user_id = uuid.uuid4()
    question_id = uuid.uuid4()

    approved_answer = SimpleNamespace(
        question_id=question_id,
        respondent_score=5,
        validated_score=4,
        estado_validacion=MaturityValidationStatus.APROBADA,
    )
    pending_answer = SimpleNamespace(
        question_id=question_id,
        respondent_score=5,
        validated_score=5,
        estado_validacion=MaturityValidationStatus.PENDIENTE,
    )

    approved_response = SimpleNamespace(
        id=uuid.uuid4(),
        status=MaturityResponseStatus.ACTIVE,
        estado_validacion=MaturityValidationStatus.APROBADA,
        answers=[approved_answer],
    )
    pending_response = SimpleNamespace(
        id=uuid.uuid4(),
        status=MaturityResponseStatus.ACTIVE,
        estado_validacion=MaturityValidationStatus.PENDIENTE,
        answers=[pending_answer],
    )

    question = SimpleNamespace(
        id=question_id,
        is_active=True,
        dimension_id=1,
        subdomain_id=10,
    )
    questionnaire = SimpleNamespace(
        responses=[approved_response, pending_response],
        questions=[question],
        dimension_weights_override={},
    )
    subdomain = SimpleNamespace(id=10, name="Strategy", display_order=1)
    dimension = SimpleNamespace(id=1, name="Governance", weight=1.0, subdomains=[subdomain])

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire",
        staticmethod(lambda _db, project_id: questionnaire),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "list_dimensions",
        staticmethod(lambda _db: [dimension]),
    )

    result = MaturityQuestionnaireService.get_results(
        _FakeDb(),
        project_id=project_id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
    )

    assert result.respondent_count == 2
    assert result.validated_response_count == 1
    assert result.overall_score == 4.0
    assert result.overall_percent == 80.0
    assert result.dimensions[0].score == 4.0
    assert result.dimensions[0].validated_question_count == 1


def test_validate_answer_keeps_response_in_draft_state(monkeypatch) -> None:
    response_id = uuid.uuid4()
    answer_id = uuid.uuid4()
    actor_user_id = uuid.uuid4()
    project_id = uuid.uuid4()

    answer = SimpleNamespace(
        id=answer_id,
        question_id=uuid.uuid4(),
        respondent_score=2,
        validated_score=None,
        estado_validacion=MaturityValidationStatus.PENDIENTE,
        validation_comments=None,
        question=None,
        evidence_url=None,
        evidence_name=None,
        evidence_type=None,
        evidence_size=None,
        created_at=datetime.now(UTC),
    )
    response = SimpleNamespace(
        id=response_id,
        questionnaire=SimpleNamespace(project_id=project_id),
        answers=[answer],
        estado_validacion=MaturityValidationStatus.PENDIENTE,
        validated_by_user_id=None,
        validated_at=None,
        validation_comments=None,
        respondent_name="Luis",
        respondent_email="luis@example.com",
        role="cdo",
        status=MaturityResponseStatus.ACTIVE,
        anulation_reason=None,
        anulated_at=None,
        anulated_by_user_id=None,
        submitted_at=datetime.now(UTC),
    )

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response_for_update",
        staticmethod(lambda _db, response_id: response),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_consultant_role",
        staticmethod(lambda **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )

    fake_db = _FakeDb()
    payload = ValidateAnswerRequest(
        validated_score=3, validacion_comentarios="Adjusted by consultant"
    )
    dto = MaturityQuestionnaireService.validate_answer(
        fake_db,
        response_id=response_id,
        answer_id=answer_id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        payload=payload,
    )

    assert fake_db.commit_calls == 1
    assert fake_db.refresh_calls == 1
    assert answer.validated_score == 3
    assert answer.estado_validacion == MaturityValidationStatus.PENDIENTE
    assert response.estado_validacion == MaturityValidationStatus.PENDIENTE
    assert dto.estado_validacion == MaturityValidationStatus.PENDIENTE


def test_finalize_evaluation_requires_all_answers_evaluated(monkeypatch) -> None:
    response_id = uuid.uuid4()
    project_id = uuid.uuid4()

    missing_answer = SimpleNamespace(
        id=uuid.uuid4(),
        question_id=uuid.uuid4(),
        validated_score=None,
        estado_validacion=MaturityValidationStatus.PENDIENTE,
    )
    response = SimpleNamespace(
        id=response_id,
        questionnaire=SimpleNamespace(project_id=project_id),
        answers=[missing_answer],
        status=MaturityResponseStatus.ACTIVE,
        estado_validacion=MaturityValidationStatus.PENDIENTE,
    )

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_response",
        staticmethod(lambda _db, response_id: response),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_consultant_role",
        staticmethod(lambda **_kwargs: None),
    )
    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "_require_project_access",
        staticmethod(lambda *_args, **_kwargs: None),
    )

    with pytest.raises(
        ValidationDomainError, match="All answers must be evaluated before finalizing"
    ):
        MaturityQuestionnaireService.finalize_response_evaluation(
            _FakeDb(),
            response_id=response_id,
            actor_user_id=uuid.uuid4(),
            actor_user_type=UserType.CONSULTOR,
            payload=SimpleNamespace(confirmation=True),
        )


@pytest.mark.asyncio
async def test_upload_evidence_accepts_csv_file(tmp_path, monkeypatch) -> None:
    project_id = uuid.uuid4()
    questionnaire = SimpleNamespace(
        project_id=project_id,
        is_closed=False,
        access_expires_at=datetime.now(UTC) + timedelta(days=1),
    )

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire_by_code",
        staticmethod(lambda _db, access_code: questionnaire),
    )
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "BACKEND_BASE_URL", "http://127.0.0.1:8000")

    file = UploadFile(filename="evidence.csv", file=BytesIO(b"col_a,col_b\n1,2\n"))

    response = await MaturityQuestionnaireService.upload_evidence(
        _FakeDb(),
        project_id=project_id,
        access_code="ACCESS123",
        file=file,
    )

    assert response.evidencia_nombre == "evidence.csv"
    assert response.evidencia_tipo in {
        "text/csv",
        "application/vnd.ms-excel",
        "application/octet-stream",
    }
    assert response.evidencia_size > 0
    assert "/media/questionnaire/" in response.evidencia_url


@pytest.mark.asyncio
async def test_upload_evidence_rejects_unsupported_extension(monkeypatch) -> None:
    project_id = uuid.uuid4()
    questionnaire = SimpleNamespace(
        project_id=project_id,
        is_closed=False,
        access_expires_at=datetime.now(UTC) + timedelta(days=1),
    )

    monkeypatch.setattr(
        MaturityQuestionnaireRepository,
        "get_questionnaire_by_code",
        staticmethod(lambda _db, access_code: questionnaire),
    )

    file = UploadFile(filename="malware.exe", file=BytesIO(b"bad"))
    with pytest.raises(ValidationDomainError, match="Unsupported evidence file type"):
        await MaturityQuestionnaireService.upload_evidence(
            _FakeDb(),
            project_id=project_id,
            access_code="ACCESS123",
            file=file,
        )
