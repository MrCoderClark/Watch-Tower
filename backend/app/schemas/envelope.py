from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class SdkInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    version: str


class Frame(BaseModel):
    model_config = ConfigDict(extra="ignore")
    function: str | None = None
    module: str | None = None
    filename: str | None = None
    abs_path: str | None = None
    lineno: int | None = None
    colno: int | None = None
    context_line: str | None = None
    pre_context: list[str] = Field(default_factory=list)
    post_context: list[str] = Field(default_factory=list)
    in_app: bool | None = None


class Stacktrace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    frames: list[Frame] = Field(default_factory=list)


class ExceptionInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: str
    value: str | None = None
    module: str | None = None
    stacktrace: Stacktrace | None = None


class RequestInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    url: str | None = None
    method: str | None = None
    headers: dict[str, Any] | None = None
    query_string: str | None = None
    data: Any = None
    cookies: dict[str, Any] | None = None


class UserInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str | None = None
    email: str | None = None
    username: str | None = None
    ip_address: str | None = None


class Breadcrumb(BaseModel):
    model_config = ConfigDict(extra="ignore")
    timestamp: datetime | None = None
    type: str | None = None
    category: str | None = None
    level: str | None = None
    message: str | None = None
    data: dict[str, Any] | None = None


class Attachment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    filename: str
    size: int | None = None
    content_type: str | None = None


class EventEnvelope(BaseModel):
    """The write-path event payload. Anything not present is treated as unknown,
    not error — SDKs vary in what they send."""

    model_config = ConfigDict(extra="ignore")

    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime | None = None
    environment: str = "production"
    release: str | None = None
    platform: str = "other"
    sdk: SdkInfo | None = None
    level: str = "error"
    message: str | None = None
    fingerprint: list[str] | None = None

    exception: ExceptionInfo | None = None
    request: RequestInfo | None = None
    user: UserInfo | None = None

    tags: dict[str, Any] = Field(default_factory=dict)
    contexts: dict[str, Any] = Field(default_factory=dict)
    breadcrumbs: list[Breadcrumb] = Field(default_factory=list)
    attachments: list[Attachment] = Field(default_factory=list)


class IngestAck(BaseModel):
    received: int
    issue_ids: list[UUID]
    event_ids: list[UUID]
