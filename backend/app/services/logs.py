"""Log ingest + query.

Ingest is a plain bulk insert with redaction on `attributes`. Query supports
full-text search over `message` via to_tsvector + GIN index (created in the
migration), plus level/service/trace_id filters and cursor pagination.
"""
from __future__ import annotations

import base64
import json
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Log, Membership, Organization, Project, User
from app.monitoring.redact import redact
from app.schemas.logs import LogEnvelope, LogIngestAck, LogListResponse, LogOut


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


async def ingest_logs(
    session: AsyncSession, project: Project, envelopes: list[LogEnvelope]
) -> LogIngestAck:
    if not envelopes:
        return LogIngestAck(received=0, log_ids=[])
    now = datetime.now(UTC)
    values = []
    for env in envelopes:
        values.append(
            {
                "project_id": project.id,
                "event_id": env.event_id,
                "occurred_at": env.timestamp or now,
                "level": env.level[:16],
                "service": (env.service or None) if env.service is None else env.service[:64],
                "message": env.message,
                "attributes": redact(env.attributes) if env.attributes else {},
                "trace_id": env.trace_id,
                "span_id": env.span_id,
            }
        )
    stmt = (
        pg_insert(Log)
        .values(values)
        .on_conflict_do_nothing(constraint="uq_logs_project_event_id")
        .returning(Log.id)
    )
    ids = [row[0] for row in (await session.execute(stmt)).all()]
    await session.commit()
    return LogIngestAck(received=len(envelopes), log_ids=ids)


def _encode_cursor(occurred_at: datetime, row_id: UUID) -> str:
    payload = {"t": occurred_at.isoformat(), "id": str(row_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return datetime.fromisoformat(payload["t"]), UUID(payload["id"])


async def list_logs(
    session: AsyncSession,
    project_slug: str,
    user: User,
    *,
    q: str | None,
    level: str | None,
    service: str | None,
    trace_id: str | None,
    from_ts: datetime | None,
    to_ts: datetime | None,
    cursor: str | None,
    limit: int,
) -> LogListResponse:
    project = await _resolve_project(session, project_slug, user)
    stmt = select(Log).where(Log.project_id == project.id)
    if q:
        # ponytail: english analyzer only; multilingual → drop the language,
        # or add a per-project setting when a customer actually needs it.
        stmt = stmt.where(
            text("to_tsvector('english', message) @@ plainto_tsquery('english', :q)")
        ).params(q=q)
    if level:
        stmt = stmt.where(Log.level == level)
    if service:
        stmt = stmt.where(Log.service == service)
    if trace_id:
        stmt = stmt.where(Log.trace_id == trace_id)
    if from_ts:
        stmt = stmt.where(Log.occurred_at >= from_ts)
    if to_ts:
        stmt = stmt.where(Log.occurred_at <= to_ts)
    if cursor:
        c_ts, c_id = _decode_cursor(cursor)
        stmt = stmt.where(
            (Log.occurred_at < c_ts)
            | ((Log.occurred_at == c_ts) & (Log.id < c_id))
        )
    stmt = stmt.order_by(desc(Log.occurred_at), desc(Log.id)).limit(limit + 1)
    rows = (await session.execute(stmt)).scalars().all()
    next_cursor: str | None = None
    if len(rows) > limit:
        rows = rows[:limit]
        last = rows[-1]
        next_cursor = _encode_cursor(last.occurred_at, last.id)
    return LogListResponse(
        items=[LogOut.model_validate(r) for r in rows], next_cursor=next_cursor
    )
