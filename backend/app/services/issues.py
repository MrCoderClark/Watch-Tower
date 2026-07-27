from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Event,
    Issue,
    IssueStatus,
    Membership,
    Organization,
    Project,
    User,
)
from app.schemas.issues import (
    FrequencyPoint,
    FrequencyResponse,
    IssueListResponse,
    IssueOut,
    ProjectSummary,
)

RANGES = {
    "24h": (timedelta(hours=24), "hour"),
    "7d": (timedelta(days=7), "hour"),
    "30d": (timedelta(days=30), "day"),
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


async def list_issues(
    session: AsyncSession,
    project_slug: str,
    user: User,
    *,
    statuses: list[str] | None,
    q: str | None,
    cursor: str | None,
    limit: int,
) -> IssueListResponse:
    project = await _resolve_project(session, project_slug, user)
    stmt = select(Issue).where(Issue.project_id == project.id)

    if statuses:
        stmt = stmt.where(Issue.status.in_(statuses))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(Issue.title.ilike(pattern))
    if cursor:
        try:
            decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
            iso, id_str = decoded.split("|", 1)
            cursor_ts = datetime.fromisoformat(iso)
            cursor_id = UUID(id_str)
            stmt = stmt.where(
                (Issue.last_seen_at < cursor_ts)
                | and_(Issue.last_seen_at == cursor_ts, Issue.id < cursor_id)
            )
        except (ValueError, UnicodeDecodeError) as e:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Invalid cursor"
            ) from e

    stmt = stmt.order_by(Issue.last_seen_at.desc(), Issue.id.desc()).limit(
        limit + 1
    )
    rows = (await session.scalars(stmt)).all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = None
    if has_more:
        last = items[-1]
        raw = f"{last.last_seen_at.isoformat()}|{last.id}"
        next_cursor = base64.urlsafe_b64encode(raw.encode()).decode()

    return IssueListResponse(
        items=[IssueOut.model_validate(i) for i in items],
        next_cursor=next_cursor,
    )


async def get_summary(
    session: AsyncSession, project_slug: str, user: User
) -> ProjectSummary:
    project = await _resolve_project(session, project_slug, user)
    cutoff = datetime.now(UTC) - timedelta(hours=24)

    unresolved_count = (
        await session.scalar(
            select(func.count(Issue.id)).where(
                Issue.project_id == project.id,
                Issue.status.in_(
                    [IssueStatus.UNRESOLVED, IssueStatus.REGRESSED]
                ),
            )
        )
    ) or 0

    events_24h = (
        await session.scalar(
            select(func.count(Event.id)).where(
                Event.project_id == project.id,
                Event.occurred_at >= cutoff,
            )
        )
    ) or 0

    unique_issues_24h = (
        await session.scalar(
            select(func.count(func.distinct(Event.issue_id))).where(
                Event.project_id == project.id,
                Event.occurred_at >= cutoff,
            )
        )
    ) or 0

    # ponytail: no user_count tracking yet, return 0 until issue_users lands
    affected_users_24h = 0

    return ProjectSummary(
        unresolved_count=int(unresolved_count),
        events_24h=int(events_24h),
        affected_users_24h=int(affected_users_24h),
        unique_issues_24h=int(unique_issues_24h),
    )


async def get_frequency(
    session: AsyncSession,
    project_slug: str,
    user: User,
    range_key: str,
) -> FrequencyResponse:
    if range_key not in RANGES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"range must be one of {sorted(RANGES.keys())}",
        )
    project = await _resolve_project(session, project_slug, user)
    window, interval = RANGES[range_key]
    cutoff = datetime.now(UTC) - window

    bucket = func.date_trunc(interval, Event.occurred_at).label("bucket")
    rows = (
        await session.execute(
            select(bucket, func.count(Event.id))
            .where(
                Event.project_id == project.id,
                Event.occurred_at >= cutoff,
            )
            .group_by(bucket)
            .order_by(bucket)
        )
    ).all()

    return FrequencyResponse(
        range=range_key,
        interval=interval,
        points=[FrequencyPoint(t=t, count=int(c)) for t, c in rows],
    )
