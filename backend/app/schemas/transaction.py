from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SpanEnvelope(BaseModel):
    model_config = ConfigDict(extra="ignore")
    span_id: str = Field(min_length=1, max_length=16)
    parent_span_id: str | None = Field(default=None, max_length=16)
    op: str = Field(max_length=64)
    description: str | None = Field(default=None, max_length=2000)
    started_at: datetime
    ended_at: datetime
    data: dict = Field(default_factory=dict)


class TransactionEnvelope(BaseModel):
    """Server-accepted performance transaction. Client envelope shape lives in
    docs/specs/performance.md; keep in sync with the SDK."""

    model_config = ConfigDict(extra="ignore")

    trace_id: str = Field(min_length=1, max_length=32)
    transaction_id: str = Field(min_length=1, max_length=16)
    name: str = Field(max_length=200)
    op: str = Field(default="http.server", max_length=64)
    status: str = Field(default="ok", max_length=16)
    environment: str = Field(default="production", max_length=64)
    release: str | None = Field(default=None, max_length=120)
    sdk_name: str | None = Field(default=None, max_length=64)
    sdk_version: str | None = Field(default=None, max_length=32)

    started_at: datetime
    ended_at: datetime

    tags: dict = Field(default_factory=dict)
    measurements: dict = Field(default_factory=dict)
    spans: list[SpanEnvelope] = Field(default_factory=list)


class TransactionIngestAck(BaseModel):
    received: int
    transaction_ids: list[UUID]
