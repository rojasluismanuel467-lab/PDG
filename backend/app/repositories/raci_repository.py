from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import and_, delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import RaciStatus
from app.models.raci import RaciActivity, RaciAssignment, RaciComment, RaciMatrix, RaciRole


class RaciRepository:
    def __init__(self, db: Session):
        self.db = db

    # ---------------- #
    # Matrices         #
    # ---------------- #
    def create_matrix(self, matrix: RaciMatrix) -> RaciMatrix:
        self.db.add(matrix)
        return matrix

    def get_matrix(self, matrix_id: UUID) -> RaciMatrix | None:
        stmt = select(RaciMatrix).where(
            and_(RaciMatrix.id == matrix_id, RaciMatrix.status != RaciStatus.ARCHIVED)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_matrix_with_relations(self, matrix_id: UUID) -> RaciMatrix | None:
        stmt = (
            select(RaciMatrix)
            .options(
                selectinload(RaciMatrix.roles),
                selectinload(RaciMatrix.activities).selectinload(RaciActivity.assignments),
                selectinload(RaciMatrix.comments),
                selectinload(RaciMatrix.history),
            )
            .where(and_(RaciMatrix.id == matrix_id, RaciMatrix.status != RaciStatus.ARCHIVED))
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_matrices_by_project(self, project_id: UUID) -> Sequence[RaciMatrix]:
        stmt = (
            select(RaciMatrix)
            .where(
                and_(RaciMatrix.project_id == project_id, RaciMatrix.status != RaciStatus.ARCHIVED)
            )
            .order_by(RaciMatrix.created_at.desc())
        )
        return self.db.execute(stmt).scalars().all()

    # ---------------- #
    # Roles            #
    # ---------------- #
    def get_role(self, role_id: UUID) -> RaciRole | None:
        return self.db.execute(select(RaciRole).where(RaciRole.id == role_id)).scalar_one_or_none()

    def create_role(self, role: RaciRole) -> RaciRole:
        self.db.add(role)
        return role

    def delete_role(self, role: RaciRole) -> None:
        self.db.delete(role)

    # ---------------- #
    # Activities       #
    # ---------------- #
    def get_activity(self, activity_id: UUID) -> RaciActivity | None:
        return self.db.execute(
            select(RaciActivity).where(RaciActivity.id == activity_id)
        ).scalar_one_or_none()

    def get_activity_with_assignments(self, activity_id: UUID) -> RaciActivity | None:
        stmt = (
            select(RaciActivity)
            .options(selectinload(RaciActivity.assignments))
            .where(RaciActivity.id == activity_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create_activity(self, activity: RaciActivity) -> RaciActivity:
        self.db.add(activity)
        return activity

    def delete_activity(self, activity: RaciActivity) -> None:
        self.db.delete(activity)

    # ---------------- #
    # Assignments      #
    # ---------------- #
    def insert_assignment(self, assignment: RaciAssignment) -> RaciAssignment:
        self.db.add(assignment)
        return assignment

    def delete_assignment_for_activity_and_role(self, activity_id: UUID, role_id: UUID) -> None:
        stmt = delete(RaciAssignment).where(
            and_(RaciAssignment.activity_id == activity_id, RaciAssignment.role_id == role_id)
        )
        self.db.execute(stmt)

    def get_assignment(self, activity_id: UUID, role_id: UUID) -> RaciAssignment | None:
        stmt = select(RaciAssignment).where(
            and_(RaciAssignment.activity_id == activity_id, RaciAssignment.role_id == role_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    # ---------------- #
    # Comments         #
    # ---------------- #
    def create_comment(self, comment: RaciComment) -> RaciComment:
        self.db.add(comment)
        return comment
