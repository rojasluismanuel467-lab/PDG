from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.core.permissions import can_assign_level
from app.exceptions.domain import ForbiddenDomainError
from app.services.project_membership_service import (
    ProjectMembershipService,
    _ProjectAccessContext,
)


def test_can_assign_level_manager_can_assign_five() -> None:
    assert can_assign_level(assigner_level=5, target_level=5, is_assigner_manager=True) is True


def test_can_assign_level_delegated_cannot_assign_five() -> None:
    assert can_assign_level(assigner_level=5, target_level=5, is_assigner_manager=False) is False


def test_project_membership_service_requires_block_level_five_for_delegation() -> None:
    context = _ProjectAccessContext(
        is_manager=False,
        actor_membership=SimpleNamespace(nivel_asis=5, nivel_tobe=4, nivel_brechas=5),
    )

    with pytest.raises(ForbiddenDomainError):
        ProjectMembershipService._validate_permission_changes(
            context=context,
            requested_fields={"nivel_tobe": 3},
        )


def test_project_membership_service_allows_manager_assign_level_five() -> None:
    context = _ProjectAccessContext(
        is_manager=True,
        actor_membership=None,
    )

    ProjectMembershipService._validate_permission_changes(
        context=context,
        requested_fields={"nivel_asis": 5, "nivel_tobe": 5, "nivel_brechas": 5},
    )
