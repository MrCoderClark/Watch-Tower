from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPk


class Log(UUIDPk, Base):
    __tablename__ = "logs"
    __table_args__ = (
        UniqueConstraint("project_id", "event_id", name="uq_logs_project_event_id"),
        Index("ix_logs_project_occurred", "project_id", "occurred_at"),
        Index("ix_logs_project_level_occurred", "project_id", "level", "occurred_at"),
        Index("ix_logs_trace_id", "trace_id"),
    )

    project_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    level: Mapped[str] = mapped_column(String(16), nullable=False, default="info")
    service: Mapped[str | None] = mapped_column(String(64))
    message: Mapped[str] = mapped_column(String, nullable=False)
    attributes: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    trace_id: Mapped[str | None] = mapped_column(String(32))
    span_id: Mapped[str | None] = mapped_column(String(16))
