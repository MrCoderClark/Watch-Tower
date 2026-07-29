from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPk


class Transaction(UUIDPk, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "transaction_id", name="uq_transactions_project_txn"
        ),
        Index("ix_transactions_project_started", "project_id", "started_at"),
        Index("ix_transactions_project_name_started", "project_id", "name", "started_at"),
    )

    project_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    trace_id: Mapped[str] = mapped_column(String(32), nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(16), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    op: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="ok")
    environment: Mapped[str] = mapped_column(String(64), nullable=False, default="production")
    release: Mapped[str | None] = mapped_column(String(120))
    sdk_name: Mapped[str | None] = mapped_column(String(64))
    sdk_version: Mapped[str | None] = mapped_column(String(32))

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)

    tags: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    measurements: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    spans: Mapped[list["Span"]] = relationship(
        back_populates="transaction", cascade="all, delete-orphan"
    )


class Span(UUIDPk, Base):
    __tablename__ = "spans"
    __table_args__ = (
        Index("ix_spans_transaction", "transaction_pk"),
    )

    transaction_pk: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
    )
    span_id: Mapped[str] = mapped_column(String(16), nullable=False)
    parent_span_id: Mapped[str | None] = mapped_column(String(16))
    op: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)

    data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    transaction: Mapped["Transaction"] = relationship(back_populates="spans")
