from __future__ import annotations

import uuid

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.enums import UserStatus, UserType
from app.models.user import User


class UserRepository:
    @staticmethod
    def get_by_id(db: Session, *, user_id: uuid.UUID) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_by_email(db: Session, *, email: str) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(User.email == email.lower())
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create(db: Session, *, user: User) -> User:
        db.add(user)
        db.flush()
        db.refresh(user)
        return user

    @staticmethod
    def list_users(
        db: Session,
        *,
        tipo_usuario: UserType | None = None,
        estado: UserStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        stmt = select(User)
        count_stmt = select(func.count(User.id))

        filters = []
        if tipo_usuario is not None:
            filters.append(User.tipo_usuario == tipo_usuario)
        if estado is not None:
            filters.append(User.estado == estado)
        if search is not None:
            search_term = f"%{search.strip()}%"
            filters.append(
                or_(
                    User.nombre.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        if filters:
            stmt = stmt.where(*filters)
            count_stmt = count_stmt.where(*filters)

        stmt = stmt.order_by(User.created_at.desc())
        items = db.execute(stmt).scalars().all()
        total = db.execute(count_stmt).scalar_one()
        return items, total
