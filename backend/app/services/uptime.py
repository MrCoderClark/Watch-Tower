"""Uptime CRUD + read-side aggregates. The worker (uptime_worker.py) records
results; this module exposes them to the API."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Membership,
    Organization,
    Project,
    UptimeCheck,
    UptimeResult,
    User,
)
from app.schemas.uptime import UptimeCheckCreate, UptimeCheckOut


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


async def list_checks(
    session: AsyncSession, project_slug: str, user: User
) -> list[UptimeCheckOut]:
    project = await _resolve_project(session, project_slug, user)
    checks = (
        (
            await session.execute(
                select(UptimeCheck)
                .where(UptimeCheck.project_id == project.id)
                .order_by(UptimeCheck.created_at)
            )
        )
        .scalars()
        .all()
    )
    if not checks:
        return []
    # Compute 24h uptime% + p95 latency in a single query, joined by check.
    since = datetime.now(UTC) - timedelta(hours=24)
    stats = {
        row.check_id: row
        for row in (
            await session.execute(
                select(
                    UptimeResult.check_id.label("check_id"),
                    (
                        func.avg(case((UptimeResult.ok.is_(True), 1), else_=0)) * 100
                    ).label("uptime_pct"),
                    func.percentile_cont(0.95)
                    .within_group(UptimeResult.latency_ms)
                    .label("p95"),
                )
                .where(
                    and_(
                        UptimeResult.check_id.in_([c.id for c in checks]),
                        UptimeResult.checked_at >= since,
                    )
                )
                .group_by(UptimeResult.check_id)
            )
        ).all()
    }
    out: list[UptimeCheckOut] = []
    for c in checks:
        row = stats.get(c.id)
        out.append(
            UptimeCheckOut(
                id=c.id,
                name=c.name,
                url=c.url,
                interval_seconds=c.interval_seconds,
                is_enabled=c.is_enabled,
                last_status=c.last_status,
                consecutive_failures=c.consecutive_failures,
                last_checked_at=c.last_checked_at,
                uptime_24h=float(row.uptime_pct) if row and row.uptime_pct is not None else None,
                latency_p95_ms=int(row.p95) if row and row.p95 is not None else None,
            )
        )
    return out


async def create_check(
    session: AsyncSession, project_slug: str, user: User, data: UptimeCheckCreate
) -> UptimeCheck:
    project = await _resolve_project(session, project_slug, user)
    check = UptimeCheck(
        project_id=project.id,
        name=data.name,
        url=str(data.url),
        interval_seconds=data.interval_seconds,
    )
    session.add(check)
    await session.commit()
    await session.refresh(check)
    return check
