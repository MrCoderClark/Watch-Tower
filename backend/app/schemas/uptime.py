from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class UptimeCheckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    url: HttpUrl
    interval_seconds: int = Field(default=60, ge=30, le=3600)


class UptimeCheckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    url: HttpUrl | None = None
    interval_seconds: int | None = Field(default=None, ge=30, le=3600)
    is_enabled: bool | None = None


class UptimeCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    url: str
    interval_seconds: int
    is_enabled: bool
    last_status: str | None
    consecutive_failures: int
    last_checked_at: datetime | None
    uptime_24h: float | None = None
    latency_p95_ms: int | None = None
