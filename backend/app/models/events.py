from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPk


class Level(StrEnum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    FATAL = "fatal"


class IssueStatus(StrEnum):
    UNRESOLVED = "unresolved"
    RESOLVED = "resolved"
    IGNORED = "ignored"
    REGRESSED = "regressed"


class Issue(UUIDPk, Timestamps, Base):
    __tablename__ = "issues"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "fingerprint", name="uq_issues_project_fingerprint"
        ),
        Index("ix_issues_project_last_seen", "project_id", "last_seen_at"),
        Index(
            "ix_issues_project_status_last_seen",
            "project_id",
            "status",
            "last_seen_at",
        ),
    )

    project_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    culprit: Mapped[str | None] = mapped_column(String(500))
    level: Mapped[Level] = mapped_column(
        String(16), nullable=False, default=Level.ERROR
    )
    status: Mapped[IssueStatus] = mapped_column(
        String(16), nullable=False, default=IssueStatus.UNRESOLVED
    )
    assignee_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    event_count: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default=text("0")
    )
    user_count: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default=text("0")
    )
    resolved_in_release: Mapped[str | None] = mapped_column(String(120))

    events: Mapped[list["Event"]] = relationship(
        back_populates="issue", cascade="all, delete-orphan"
    )


class Event(UUIDPk, Base):
    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("project_id", "event_id", name="uq_events_project_event_id"),
        Index("ix_events_project_occurred", "project_id", "occurred_at"),
        Index("ix_events_issue_occurred", "issue_id", "occurred_at"),
    )

    project_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    issue_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    environment: Mapped[str] = mapped_column(String(64), nullable=False, default="production")
    release: Mapped[str | None] = mapped_column(String(120))
    platform: Mapped[str] = mapped_column(String(32), nullable=False, default="other")
    sdk_name: Mapped[str | None] = mapped_column(String(64))
    sdk_version: Mapped[str | None] = mapped_column(String(32))

    level: Mapped[Level] = mapped_column(String(16), nullable=False, default=Level.ERROR)
    message: Mapped[str | None] = mapped_column(String(2000))
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)

    exception: Mapped[dict | None] = mapped_column(JSONB)
    stacktrace: Mapped[dict | None] = mapped_column(JSONB)
    request: Mapped[dict | None] = mapped_column(JSONB)
    user_: Mapped[dict | None] = mapped_column("user_", JSONB)
    tags: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    contexts: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    breadcrumbs: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    attachments: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    browser_name: Mapped[str | None] = mapped_column(String(64))
    browser_version: Mapped[str | None] = mapped_column(String(32))
    os_name: Mapped[str | None] = mapped_column(String(64))
    os_version: Mapped[str | None] = mapped_column(String(32))

    issue: Mapped["Issue"] = relationship(back_populates="events")
