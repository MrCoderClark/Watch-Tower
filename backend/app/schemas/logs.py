from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class LogEnvelope(BaseModel):
    """Client-sent log record. Envelope shape lives in docs/specs/logging.md."""

    model_config = ConfigDict(extra="ignore")

    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime | None = None
    level: str = Field(default="info", max_length=16)
    service: str | None = Field(default=None, max_length=64)
    message: str = Field(min_length=1)
    attributes: dict = Field(default_factory=dict)
    trace_id: str | None = Field(default=None, max_length=32)
    span_id: str | None = Field(default=None, max_length=16)


class LogIngestAck(BaseModel):
    received: int
    log_ids: list[UUID]


class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    occurred_at: datetime
    level: str
    service: str | None
    message: str
    attributes: dict
    trace_id: str | None
    span_id: str | None


class LogListResponse(BaseModel):
    items: list[LogOut]
    next_cursor: str | None
