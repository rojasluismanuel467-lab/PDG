from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

def _engine_kwargs_for_url(database_url: str) -> dict:
    kwargs: dict = {"future": True}
    if database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_pre_ping"] = True
    return kwargs


def _candidate_database_urls() -> list[str]:
    candidates: list[str] = []
    if settings.DATABASE_URL:
        candidates.append(settings.DATABASE_URL)
    if settings.DB_FALLBACK_ENABLED and settings.LOCAL_DATABASE_URL:
        candidates.append(settings.LOCAL_DATABASE_URL)
    # Deduplicate while preserving order.
    return list(dict.fromkeys(candidates))


def _create_working_engine():
    last_error: Exception | None = None
    for database_url in _candidate_database_urls():
        try:
            candidate = create_engine(database_url, **_engine_kwargs_for_url(database_url))
            with candidate.connect():
                pass
            return candidate
        except Exception as exc:  # pragma: no cover - runtime connectivity guard
            last_error = exc
    if last_error is not None:
        raise last_error
    raise RuntimeError("No DATABASE_URL configured and no LOCAL_DATABASE_URL fallback available.")


engine = _create_working_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
