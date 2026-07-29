from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectKeyOut(BaseModel):
    id: UUID
    kind: str
    key_prefix: str
    label: str | None
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectKeyCreate(BaseModel):
    kind: str = Field("secret", pattern="^(public|secret)$")
    label: str | None = Field(None, max_length=120)


class ProjectKeyCreatedOut(ProjectKeyOut):
    """Only returned once, immediately after creation."""

    plaintext: str
