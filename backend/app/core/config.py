from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    PROJECT_NAME: str = "ARQDATA API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # Pydantic v2 maneja la conversión a lista de un string JSON internamente
        raise ValueError(v)

    # Primary DB URL (e.g. Railway reference variable in production).
    DATABASE_URL: str | None = None
    # Local fallback for developer machines when primary DB is unavailable.
    LOCAL_DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5434/arqdata"
    # Enables automatic fallback from DATABASE_URL -> LOCAL_DATABASE_URL.
    DB_FALLBACK_ENABLED: bool = True
    ADMIN_SEED_EMAIL: str = "admin@arqdata.local"
    ADMIN_SEED_NAME: str = "Administrador Inicial"
    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    BACKEND_BASE_URL: str = "http://127.0.0.1:8000"
    MEDIA_ROOT: str = "uploads"


settings = Settings()
