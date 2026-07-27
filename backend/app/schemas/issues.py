from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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
