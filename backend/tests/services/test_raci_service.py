from uuid import uuid4

import pytest

from app.core.enums import RaciAssignmentType
from app.schemas.raci import RaciAssignmentUpdate
from app.services.raci_service import ConflictDomainError, RaciService


# Mock objects to avoid DB dependency in pure logic test
class MockAssignment:
    def __init__(self, role_id, assignment_type):
        self.role_id = role_id
        self.assignment_type = assignment_type


class MockActivity:
    def __init__(self, id, matrix_id, assignments):
        self.id = id
        self.matrix_id = matrix_id
        self.assignments = assignments


class MockRepo:
    def __init__(self):
        self.activities = {}
        self.queries = []

    def get_activity_with_assignments(self, activity_id):
        return self.activities.get(activity_id)

    def delete_assignment_for_activity_and_role(self, activity_id, role_id):
        self.queries.append(("delete", activity_id, role_id))

    def insert_assignment(self, assignment):
        self.queries.append(("insert", assignment))


class MockSession:
    def commit(self):
        pass


def test_update_assignments_success():
    db = MockSession()
    service = RaciService(db)
    service.repo = MockRepo()

    matrix_id = uuid4()
    activity_id = uuid4()
    role_id_1 = uuid4()
    role_id_2 = uuid4()

    # Actividad preexistente sin 'A'
    activity = MockActivity(
        id=activity_id,
        matrix_id=matrix_id,
        assignments=[MockAssignment(role_id_1, RaciAssignmentType.R)],
    )
    service.repo.activities[activity_id] = activity

    # Update adding an 'A' safely
    updates = [RaciAssignmentUpdate(role_id=role_id_2, assignment_type=RaciAssignmentType.A)]

    service.update_assignments(matrix_id, activity_id, updates)

    assert len(service.repo.queries) > 0


def test_update_assignments_fails_multiple_A():
    db = MockSession()
    service = RaciService(db)
    service.repo = MockRepo()

    matrix_id = uuid4()
    activity_id = uuid4()
    role_id_1 = uuid4()
    role_id_2 = uuid4()

    # Actividad preexistente con un 'A'
    activity = MockActivity(
        id=activity_id,
        matrix_id=matrix_id,
        assignments=[MockAssignment(role_id_1, RaciAssignmentType.A)],
    )
    service.repo.activities[activity_id] = activity

    # Try adding another 'A' to different role
    updates = [RaciAssignmentUpdate(role_id=role_id_2, assignment_type=RaciAssignmentType.A)]

    with pytest.raises(ConflictDomainError) as exc_info:
        service.update_assignments(matrix_id, activity_id, updates)

    assert "No puede haber más de un Accountable (A) por actividad." in str(exc_info.value)


def test_update_assignments_allows_swapping_A():
    db = MockSession()
    service = RaciService(db)
    service.repo = MockRepo()

    matrix_id = uuid4()
    activity_id = uuid4()
    role_id_1 = uuid4()
    role_id_2 = uuid4()

    # Actividad preexistente con un 'A'
    activity = MockActivity(
        id=activity_id,
        matrix_id=matrix_id,
        assignments=[MockAssignment(role_id_1, RaciAssignmentType.A)],
    )
    service.repo.activities[activity_id] = activity

    # Try swapping: remove A from role 1, add A to role 2
    updates = [
        RaciAssignmentUpdate(role_id=role_id_1, assignment_type=None),  # Remove assignment
        RaciAssignmentUpdate(role_id=role_id_2, assignment_type=RaciAssignmentType.A),
    ]

    # Should not raise exception
    service.update_assignments(matrix_id, activity_id, updates)
    assert len(service.repo.queries) > 0
