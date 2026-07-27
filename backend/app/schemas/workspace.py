from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OrganizationOut(BaseModel):
    id: UUID
    slug: str
    name: str
    plan: str
    role: str  # caller's membership role
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: UUID
    slug: str
    name: str
    platform: str
    organization_id: UUID
    team_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    platform: str = Field("javascript", max_length=32)
