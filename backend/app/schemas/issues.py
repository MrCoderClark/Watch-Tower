from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class IssueOut(BaseModel):
    id: UUID
    fingerprint: str
    title: str
    culprit: str | None
    level: str
    status: str
    first_seen_at: datetime
    last_seen_at: datetime
    event_count: int
    user_count: int

    model_config = {"from_attributes": True}


class IssueListResponse(BaseModel):
    items: list[IssueOut]
    next_cursor: str | None


class EventOut(BaseModel):
    id: UUID
    event_id: UUID
    occurred_at: datetime
    received_at: datetime
    environment: str
    release: str | None
    platform: str
    sdk_name: str | None
    sdk_version: str | None
    level: str
    message: str | None
    exception: dict[str, Any] | None
    request: dict[str, Any] | None
    user_: dict[str, Any] | None = Field(default=None, serialization_alias="user")
    tags: dict[str, Any]
    contexts: dict[str, Any]
    breadcrumbs: list[dict[str, Any]]
    attachments: list[dict[str, Any]]
    browser_name: str | None
    browser_version: str | None
    os_name: str | None
    os_version: str | None

    model_config = {"from_attributes": True, "populate_by_name": True}


class IssueDetailOut(IssueOut):
    sample_event: EventOut | None


class IssueUpdate(BaseModel):
    status: str = Field(..., pattern="^(unresolved|resolved|ignored)$")


class ProjectSummary(BaseModel):
    unresolved_count: int
    events_24h: int
    affected_users_24h: int
    unique_issues_24h: int


class FrequencyPoint(BaseModel):
    t: datetime
    count: int


class FrequencyResponse(BaseModel):
    range: str
    interval: str  # "hour" | "day"
    points: list[FrequencyPoint]
