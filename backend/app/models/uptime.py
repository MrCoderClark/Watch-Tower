from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPk


class UptimeCheck(UUIDPk, Timestamps, Base):
    __tablename__ = "uptime_checks"
    __table_args__ = (
        Index("ix_uptime_checks_project", "project_id"),
        Index("ix_uptime_checks_due", "is_enabled", "next_run_at"),
    )

    project_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    interval_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("60")
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    # State machine: "up" | "down" | null (never checked). Flip up→down after
    # consecutive_failures crosses 2; that's when we page.
    last_status: Mapped[str | None] = mapped_column(String(8))
    consecutive_failures: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UptimeResult(UUIDPk, Base):
    __tablename__ = "uptime_results"
    __table_args__ = (
        Index("ix_uptime_results_check_checked", "check_id", "checked_at"),
    )

    check_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("uptime_checks.id", ondelete="CASCADE"),
        nullable=False,
    )
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    ok: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(String(500))
