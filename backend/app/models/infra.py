from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPk


class Host(UUIDPk, Timestamps, Base):
    __tablename__ = "hosts"
    __table_args__ = (
        UniqueConstraint("project_id", "hostname", name="uq_hosts_project_hostname"),
        Index("ix_hosts_project", "project_id"),
    )

    project_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_version: Mapped[str | None] = mapped_column(String(32))
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    interval_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("60")
    )

    metrics: Mapped[list["MetricSample"]] = relationship(
        back_populates="host", cascade="all, delete-orphan"
    )


class MetricSample(UUIDPk, Base):
    __tablename__ = "metrics_1m"
    __table_args__ = (
        Index("ix_metrics_1m_host_ts", "host_id", "ts"),
    )

    host_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("hosts.id", ondelete="CASCADE"),
        nullable=False,
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    cpu_pct: Mapped[float | None] = mapped_column(Float)
    mem_used_bytes: Mapped[int | None] = mapped_column(BigInteger)
    mem_total_bytes: Mapped[int | None] = mapped_column(BigInteger)
    disk_used_bytes: Mapped[int | None] = mapped_column(BigInteger)
    disk_total_bytes: Mapped[int | None] = mapped_column(BigInteger)
    net_rx_bytes: Mapped[int | None] = mapped_column(BigInteger)
    net_tx_bytes: Mapped[int | None] = mapped_column(BigInteger)
    process_count: Mapped[int | None] = mapped_column(Integer)

    host: Mapped["Host"] = relationship(back_populates="metrics")
