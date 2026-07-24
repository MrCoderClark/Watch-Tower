from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env.local", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(..., description="SQLAlchemy async DSN, e.g. postgresql+asyncpg://…")
    secret_key: str = Field(..., min_length=32)
    environment: str = "development"

    access_token_minutes: int = 15
    refresh_token_days: int = 30
    jwt_algorithm: str = "HS256"

    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
