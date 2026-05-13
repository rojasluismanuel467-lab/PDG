from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.dependencies.auth import get_current_user
from app.main import app
from app.schemas.brechas import (
    CRUDComparisonSchema,
    CRUDMatrixResponse,
    IntegrationQualityRulesResponse,
    IntegrationRuleSchema,
)
from app.services.brechas_service import BrechasService


def _crud_response(project_id: uuid.UUID, artifact_id: uuid.UUID) -> CRUDMatrixResponse:
    now = datetime(2026, 4, 13, tzinfo=UTC)
    return CRUDMatrixResponse(
        id=uuid.uuid4(),
        proyecto_id=project_id,
        entregable_id=artifact_id,
        nombre="Matriz CRUD Comparativa",
        descripcion="desc",
        comparaciones=[
            CRUDComparisonSchema(
                id="crud-1",
                entidad="Cliente",
                asis_create=True,
                asis_read=True,
                asis_update=True,
                asis_delete=False,
                tobe_create=True,
                tobe_read=True,
                tobe_update=True,
                tobe_delete=True,
                brecha="Cambio de reglas de eliminacion.",
                impacto="Alto",
            )
        ],
        version_actual="1.0",
        historial_versiones=[],
        created_at=now,
        updated_at=now,
    )


def test_get_crud_matrix_endpoint_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    expected = _crud_response(project_id, artifact_id)

    monkeypatch.setattr(
        BrechasService,
        "get_crud_matrix",
        staticmethod(lambda db, project_id, artifact_id, actor_user_id, actor_user_email: expected),
    )

    response = client.get(f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/crud-matrix")
    assert response.status_code == 200
    payload = response.json()
    assert payload["nombre"] == "Matriz CRUD Comparativa"
    assert payload["comparaciones"][0]["impacto"] == "Alto"


def test_gap_report_export_endpoint_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()

    monkeypatch.setattr(
        BrechasService,
        "export_gap_report",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_email, export_format: (
                b"fake-pdf-content",
                "application/pdf",
                "gap-analysis-report-test.pdf",
            )
        ),
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/gap-analysis-report/export",
        json={"formato": "pdf"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert (
        'attachment; filename="gap-analysis-report-test.pdf"'
        in response.headers["content-disposition"]
    )
    assert response.content == b"fake-pdf-content"


def test_get_integration_rules_endpoint_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    now = datetime(2026, 4, 13, tzinfo=UTC)
    expected = IntegrationQualityRulesResponse(
        id=uuid.uuid4(),
        proyecto_id=project_id,
        entregable_id=artifact_id,
        nombre="Reglas de Integracion y Calidad de Datos",
        descripcion="desc",
        resumen_tecnico="summary",
        reglas=[
            IntegrationRuleSchema(
                id="rule-1",
                nombre="Regla Matching",
                descripcion="desc",
                tipo="Matching",
                prioridad="Alta",
                condicion="condicion",
                accion="accion",
            )
        ],
        criterios_aceptacion=["ok"],
        formato_objetivo=["PDF", "WORD"],
        version_actual="1.0",
        historial_versiones=[],
        created_at=now,
        updated_at=now,
    )

    monkeypatch.setattr(
        BrechasService,
        "get_integration_rules",
        staticmethod(lambda db, project_id, artifact_id, actor_user_id, actor_user_email: expected),
    )

    response = client.get(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/integration-quality-rules"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["nombre"] == "Reglas de Integracion y Calidad de Datos"
    assert payload["reglas"][0]["tipo"] == "Matching"
