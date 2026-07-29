"""Infrastructure (host metrics) ingest + read."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Host, MetricSample, Membership, Organization, Project, User
from app.schemas.infra import (
    HostMetricsSeries,
    HostOut,
    MetricEnvelope,
    MetricIngestAck,
    MetricPoint,
)

_METRIC_COLUMNS = {
    "cpu_pct": MetricSample.cpu_pct,
    "mem_used_bytes": MetricSample.mem_used_bytes,
    "mem_total_bytes": MetricSample.mem_total_bytes,
    "disk_used_bytes": MetricSample.disk_used_bytes,
    "disk_total_bytes": MetricSample.disk_total_bytes,
    "net_rx_bytes": MetricSample.net_rx_bytes,
    "net_tx_bytes": MetricSample.net_tx_bytes,
    "process_count": MetricSample.process_count,
}

_RANGES = {
    "1h": timedelta(hours=1),
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
}


async def _resolve_project(
    session: AsyncSession, project_slug: str, user: User
) -> Project:
    project = await session.scalar(
        select(Project)
        .join(Organization, Organization.id == Project.organization_id)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Project.slug == project_slug, Membership.user_id == user.id)
    )
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


async def _get_or_create_host(
    session: AsyncSession, project_id: UUID, env: MetricEnvelope
) -> Host:
    now = datetime.now(UTC)
    stmt = (
        pg_insert(Host)
        .values(
            project_id=project_id,
            hostname=env.hostname[:255],
            agent_version=env.agent_version,
            interval_seconds=env.interval_seconds,
            last_heartbeat_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_hosts_project_hostname",
            set_={
                "last_heartbeat_at": now,
                "interval_seconds": env.interval_seconds,
                "agent_version": env.agent_version,
            },
        )
        .returning(Host.id)
    )
    host_id: UUID = (await session.execute(stmt)).scalar_one()
    host = await session.get(Host, host_id)
    assert host is not None
    return host


async def ingest_metrics(
    session: AsyncSession, project: Project, envelopes: list[MetricEnvelope]
) -> MetricIngestAck:
    if not envelopes:
        return MetricIngestAck(received=0, host_ids=[])
    seen_hosts: dict[str, UUID] = {}
    for env in envelopes:
        host = await _get_or_create_host(session, project.id, env)
        seen_hosts[env.hostname] = host.id
        session.add(
            MetricSample(
                host_id=host.id,
                ts=env.ts,
                cpu_pct=env.cpu_pct,
                mem_used_bytes=env.mem_used_bytes,
                mem_total_bytes=env.mem_total_bytes,
                disk_used_bytes=env.disk_used_bytes,
                disk_total_bytes=env.disk_total_bytes,
                net_rx_bytes=env.net_rx_bytes,
                net_tx_bytes=env.net_tx_bytes,
                process_count=env.process_count,
            )
        )
    await session.commit()
    return MetricIngestAck(received=len(envelopes), host_ids=list(seen_hosts.values()))


def _online(host: Host) -> bool:
    if host.last_heartbeat_at is None:
        return False
    cutoff = datetime.now(UTC) - timedelta(seconds=host.interval_seconds * 3)
    return host.last_heartbeat_at >= cutoff


async def list_hosts(
    session: AsyncSession, project_slug: str, user: User
) -> list[HostOut]:
    project = await _resolve_project(session, project_slug, user)
    hosts = list(
        (
            await session.execute(
                select(Host)
                .where(Host.project_id == project.id)
                .order_by(Host.hostname)
            )
        )
        .scalars()
        .all()
    )
    out: list[HostOut] = []
    for h in hosts:
        latest = await session.scalar(
            select(MetricSample)
            .where(MetricSample.host_id == h.id)
            .order_by(desc(MetricSample.ts))
            .limit(1)
        )
        cpu = mem = disk = None
        if latest:
            cpu = latest.cpu_pct
            if latest.mem_used_bytes and latest.mem_total_bytes:
                mem = 100 * latest.mem_used_bytes / latest.mem_total_bytes
            if latest.disk_used_bytes and latest.disk_total_bytes:
                disk = 100 * latest.disk_used_bytes / latest.disk_total_bytes
        out.append(
            HostOut(
                id=h.id,
                hostname=h.hostname,
                agent_version=h.agent_version,
                last_heartbeat_at=h.last_heartbeat_at,
                interval_seconds=h.interval_seconds,
                online=_online(h),
                latest_cpu_pct=cpu,
                latest_mem_pct=mem,
                latest_disk_pct=disk,
            )
        )
    return out


async def get_host_metrics(
    session: AsyncSession,
    project_slug: str,
    user: User,
    host_id: UUID,
    metric: str,
    range_: str,
) -> HostMetricsSeries:
    project = await _resolve_project(session, project_slug, user)
    host = await session.get(Host, host_id)
    if host is None or host.project_id != project.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Host not found")
    col = _METRIC_COLUMNS.get(metric)
    if col is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown metric: {metric}")
    delta = _RANGES.get(range_)
    if delta is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown range: {range_}")
    since = datetime.now(UTC) - delta
    rows = (
        await session.execute(
            select(MetricSample.ts, col.label("v"))
            .where(and_(MetricSample.host_id == host.id, MetricSample.ts >= since))
            .order_by(MetricSample.ts)
        )
    ).all()
    return HostMetricsSeries(
        metric=metric,
        points=[MetricPoint(ts=r.ts, value=r.v) for r in rows],
    )
