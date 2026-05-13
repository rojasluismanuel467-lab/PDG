from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.core.enums import PermissionLevel, ProjectArtifactStatus, ProjectBlock, UserType
from app.exceptions.domain import ForbiddenDomainError
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ArtifactReviewRequest, UpdateArtifactRequest
from app.services.project_permission_service import ProjectPermissionService
from app.services.project_service import ProjectService


class _FakeDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


def _artifact(
    *,
    status: ProjectArtifactStatus = ProjectArtifactStatus.IN_PROGRESS,
    consultant_approved: bool = False,
    company_approved: bool = False,
) -> SimpleNamespace:
    now = datetime(2026, 4, 1, tzinfo=UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        code="TOBE_LOGICAL_DATA_MODEL",
        name="TO-BE Logical Data Model",
        description="desc",
        block=ProjectBlock.TO_BE,
        order_index=6,
        block_order=2,
        status=status,
        is_applicable=True,
        consultant_approved=consultant_approved,
        company_approved=company_approved,
        consultant_approved_at=now if consultant_approved else None,
        company_approved_at=now if company_approved else None,
        approved_at=now if status == ProjectArtifactStatus.APPROVED else None,
        approved_by_user_id=uuid.uuid4() if status == ProjectArtifactStatus.APPROVED else None,
        review_cycles=0,
        last_rejection_reason=None,
        created_at=now,
        updated_at=now,
    )


def _patch_common(
    monkeypatch, artifact: SimpleNamespace, *, level: PermissionLevel = PermissionLevel.EDITAR
) -> None:
    project = SimpleNamespace(id=artifact.project_id)
    membership = SimpleNamespace(is_manager=True)
    monkeypatch.setattr(
        ProjectRepository,
        "get_artifact_by_id",
        staticmethod(lambda _db, project_id, artifact_id: artifact),
    )
    monkeypatch.setattr(
        ProjectPermissionService,
        "resolve_artifact_level",
        staticmethod(lambda *_args, **_kwargs: (project, membership, int(level))),
    )
    monkeypatch.setattr(
        ProjectRepository,
        "add_audit_log",
        staticmethod(lambda *_args, **_kwargs: None),
    )


def test_update_project_artifact_blocks_any_change_when_approved(monkeypatch) -> None:
    db = _FakeDb()
    actor_user_id = uuid.uuid4()
    artifact = _artifact(
        status=ProjectArtifactStatus.APPROVED, consultant_approved=True, company_approved=True
    )
    _patch_common(monkeypatch, artifact)

    with pytest.raises(ForbiddenDomainError, match="approved and cannot be modified"):
        ProjectService.update_project_artifact(
            db,
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            actor_user_id=actor_user_id,
            actor_user_type=UserType.CONSULTOR,
            payload=UpdateArtifactRequest(status=ProjectArtifactStatus.IN_PROGRESS),
        )

    assert db.commit_calls == 0


def test_update_project_artifact_blocks_direct_approval_flags(monkeypatch) -> None:
    db = _FakeDb()
    actor_user_id = uuid.uuid4()
    artifact = _artifact()
    _patch_common(monkeypatch, artifact)

    with pytest.raises(ForbiddenDomainError, match="Direct approval flags are disabled"):
        ProjectService.update_project_artifact(
            db,
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            actor_user_id=actor_user_id,
            actor_user_type=UserType.CONSULTOR,
            payload=UpdateArtifactRequest(consultant_approved=True),
        )


def test_consultant_review_moves_to_approved(monkeypatch) -> None:
    db = _FakeDb()
    actor_user_id = uuid.uuid4()
    artifact = _artifact(status=ProjectArtifactStatus.IN_PROGRESS)
    _patch_common(monkeypatch, artifact, level=PermissionLevel.APROBAR)

    response = ProjectService.review_project_artifact_consultant(
        db,
        project_id=artifact.project_id,
        artifact_id=artifact.id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.CONSULTOR,
        payload=ArtifactReviewRequest(approved=True),
    )

    # Now moves directly to APPROVED
    assert response.status == ProjectArtifactStatus.APPROVED
    assert response.consultant_approved is True
    assert response.company_approved is False
    assert db.commit_calls == 1


def test_company_review_finishes_dual_approval(monkeypatch) -> None:
    db = _FakeDb()
    actor_user_id = uuid.uuid4()
    artifact = _artifact(
        status=ProjectArtifactStatus.PENDING_COMPANY_APPROVAL,
        consultant_approved=True,
        company_approved=False,
    )
    _patch_common(monkeypatch, artifact, level=PermissionLevel.APROBAR)

    response = ProjectService.review_project_artifact_company(
        db,
        project_id=artifact.project_id,
        artifact_id=artifact.id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.EMPRESA,
        payload=ArtifactReviewRequest(approved=True),
    )

    assert response.status == ProjectArtifactStatus.APPROVED
    assert response.consultant_approved is True
    assert response.company_approved is True
    assert db.commit_calls == 1


def test_rejection_resets_approvals_and_increments_cycles(monkeypatch) -> None:
    db = _FakeDb()
    actor_user_id = uuid.uuid4()
    artifact = _artifact(
        status=ProjectArtifactStatus.PENDING_COMPANY_APPROVAL,
        consultant_approved=True,
        company_approved=False,
    )
    _patch_common(monkeypatch, artifact, level=PermissionLevel.APROBAR)

    response = ProjectService.review_project_artifact_company(
        db,
        project_id=artifact.project_id,
        artifact_id=artifact.id,
        actor_user_id=actor_user_id,
        actor_user_type=UserType.EMPRESA,
        payload=ArtifactReviewRequest(approved=False, reason="Need corrections"),
    )

    assert response.status == ProjectArtifactStatus.IN_PROGRESS
    assert response.consultant_approved is False
    assert response.company_approved is False
    assert response.review_cycles == 1
    assert response.last_rejection_reason == "Need corrections"
