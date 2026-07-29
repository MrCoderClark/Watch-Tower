from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MetricEnvelope(BaseModel):
    """Agent-sent metric batch entry. Envelope shape mirrors docs/specs/infrastructure.md."""

    model_config = ConfigDict(extra="ignore")

    hostname: str = Field(min_length=1, max_length=255)
    agent_version: str | None = Field(default=None, max_length=32)
    interval_seconds: int = Field(default=60, ge=10, le=3600)
    ts: datetime

    cpu_pct: float | None = None
    mem_used_bytes: int | None = None
    mem_total_bytes: int | None = None
    disk_used_bytes: int | None = None
    disk_total_bytes: int | None = None
    net_rx_bytes: int | None = None
    net_tx_bytes: int | None = None
    process_count: int | None = None


class MetricIngestAck(BaseModel):
    received: int
    host_ids: list[UUID]


class HostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    hostname: str
    agent_version: str | None
    last_heartbeat_at: datetime | None
    interval_seconds: int
    online: bool
    latest_cpu_pct: float | None = None
    latest_mem_pct: float | None = None
    latest_disk_pct: float | None = None


class MetricPoint(BaseModel):
    ts: datetime
    value: float | None


class HostMetricsSeries(BaseModel):
    metric: str
    points: list[MetricPoint]
