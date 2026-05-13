from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.exceptions.domain import NotFoundDomainError, ValidationDomainError
from app.repositories.brechas_repository import BrechasRepository
from app.schemas.brechas import (
    BrechaImpacto,
    BrechaPrioridad,
    ExportFormat,
    GapAnalysisReportResponse,
    GapSchema,
    IntegrationQualityRulesResponse,
    IntegrationRulePriority,
    IntegrationRuleSchema,
    IntegrationRuleType,
)
from app.services.brechas_service import BrechasService, _EntitySnapshot


def test_generate_crud_matrix_payload_is_deterministic(monkeypatch: pytest.MonkeyPatch) -> None:
    context = {
        "project_id": uuid.uuid4(),
        "project_name": "Banco Demo",
        "asis": [
            _EntitySnapshot(nombre="Cliente", atributos=5, fks=0),
            _EntitySnapshot(nombre="Cuenta", atributos=6, fks=1),
        ],
        "tobe": [
            _EntitySnapshot(nombre="Cliente", atributos=8, fks=1),
            _EntitySnapshot(nombre="Cuenta", atributos=7, fks=1),
            _EntitySnapshot(nombre="Segmento", atributos=4, fks=0),
        ],
        "dfd_asis_flows": 3,
        "dfd_tobe_flows": 6,
    }
    monkeypatch.setattr(
        BrechasService, "_build_context", classmethod(lambda cls, db, project_id: context)
    )

    first = BrechasService._generate_crud_matrix_payload(None, project_id=uuid.uuid4())
    second = BrechasService._generate_crud_matrix_payload(None, project_id=uuid.uuid4())

    assert first == second
    assert first["nombre"] == "Matriz CRUD Comparativa"
    assert len(first["comparaciones"]) == 3
    assert first["comparaciones"][0]["entidad"] == "Cliente"


def test_resolve_artifact_raises_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        BrechasRepository,
        "get_artifact",
        staticmethod(lambda db, project_id, artifact_id: None),
    )

    with pytest.raises(NotFoundDomainError, match="Project artifact not found"):
        BrechasService._resolve_artifact(
            None,
            project_id=uuid.uuid4(),
            artifact_id=uuid.uuid4(),
            expected_code=BrechasService.CRUD_ARTIFACT_CODE,
        )


def test_resolve_artifact_raises_code_mismatch(monkeypatch: pytest.MonkeyPatch) -> None:
    artifact = SimpleNamespace(code=BrechasService.GAP_REPORT_ARTIFACT_CODE)
    monkeypatch.setattr(
        BrechasRepository,
        "get_artifact",
        staticmethod(lambda db, project_id, artifact_id: artifact),
    )

    with pytest.raises(ValidationDomainError, match="Artifact code mismatch"):
        BrechasService._resolve_artifact(
            None,
            project_id=uuid.uuid4(),
            artifact_id=uuid.uuid4(),
            expected_code=BrechasService.CRUD_ARTIFACT_CODE,
        )


def test_export_gap_report_all_formats(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 13, tzinfo=UTC)
    report = GapAnalysisReportResponse(
        id=uuid.uuid4(),
        proyecto_id=uuid.uuid4(),
        entregable_id=uuid.uuid4(),
        nombre="Reporte de Analisis de Brechas",
        descripcion="desc",
        resumen_ejecutivo="Resumen ejecutivo de prueba",
        brechas=[
            GapSchema(
                id="gap-1",
                area="Modelo de Datos y Dominio",
                brecha="Brecha en entidad Cliente",
                impacto=BrechaImpacto.ALTO,
                prioridad=BrechaPrioridad.ALTA,
                recomendacion="Definir controles de calidad.",
            )
        ],
        total_brechas=1,
        brechas_criticas=0,
        recomendaciones_prioritarias=["Definir controles de calidad."],
        formato_objetivo=["PDF", "WORD", "MARKDOWN"],
        version_actual="1.0",
        historial_versiones=[],
        created_at=now,
        updated_at=now,
    )

    monkeypatch.setattr(
        BrechasService,
        "get_gap_report",
        classmethod(
            lambda cls, db, project_id, artifact_id, actor_user_id, actor_user_email: report
        ),
    )

    md_content, md_mime, md_name = BrechasService.export_gap_report(
        None,
        project_id=uuid.uuid4(),
        artifact_id=uuid.uuid4(),
        actor_user_id=uuid.uuid4(),
        actor_user_email="consultor@acme.com",
        export_format=ExportFormat.MARKDOWN,
    )
    assert md_mime == "text/markdown; charset=utf-8"
    assert md_name.endswith(".md")
    assert b"# Reporte de Analisis de Brechas" in md_content

    pdf_content, pdf_mime, pdf_name = BrechasService.export_gap_report(
        None,
        project_id=uuid.uuid4(),
        artifact_id=uuid.uuid4(),
        actor_user_id=uuid.uuid4(),
        actor_user_email="consultor@acme.com",
        export_format=ExportFormat.PDF,
    )
    assert pdf_mime == "application/pdf"
    assert pdf_name.endswith(".pdf")
    assert pdf_content.startswith(b"%PDF")

    docx_content, docx_mime, docx_name = BrechasService.export_gap_report(
        None,
        project_id=uuid.uuid4(),
        artifact_id=uuid.uuid4(),
        actor_user_id=uuid.uuid4(),
        actor_user_email="consultor@acme.com",
        export_format=ExportFormat.WORD,
    )
    assert docx_mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert docx_name.endswith(".docx")
    assert docx_content.startswith(b"PK")


def test_export_integration_rules_word(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 13, tzinfo=UTC)
    rules = IntegrationQualityRulesResponse(
        id=uuid.uuid4(),
        proyecto_id=uuid.uuid4(),
        entregable_id=uuid.uuid4(),
        nombre="Reglas de Integracion y Calidad",
        descripcion="desc",
        resumen_tecnico="Resumen tecnico de prueba",
        reglas=[
            IntegrationRuleSchema(
                id="rule-1",
                nombre="Regla Matching Cliente",
                descripcion="desc",
                tipo=IntegrationRuleType.MATCHING,
                prioridad=IntegrationRulePriority.ALTA,
                condicion="cliente_id no nulo",
                accion="rechazar registro si no cumple",
            )
        ],
        criterios_aceptacion=["Regla aplicada en 100% de registros"],
        formato_objetivo=["WORD", "PDF"],
        version_actual="1.0",
        historial_versiones=[],
        created_at=now,
        updated_at=now,
    )

    monkeypatch.setattr(
        BrechasService,
        "get_integration_rules",
        classmethod(
            lambda cls, db, project_id, artifact_id, actor_user_id, actor_user_email: rules
        ),
    )

    content, mime, name = BrechasService.export_integration_rules(
        None,
        project_id=uuid.uuid4(),
        artifact_id=uuid.uuid4(),
        actor_user_id=uuid.uuid4(),
        actor_user_email="consultor@acme.com",
        export_format=ExportFormat.WORD,
    )
    assert mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert name.endswith(".docx")
    assert content.startswith(b"PK")
