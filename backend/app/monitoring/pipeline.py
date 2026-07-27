"""Event ingest pipeline: redact → fingerprint → group into Issue → persist Event."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Event, Issue, IssueStatus, Level, Project
from app.monitoring.fingerprint import fingerprint as compute_fingerprint
from app.monitoring.redact import redact
from app.schemas.envelope import EventEnvelope, IngestAck


async def ingest_events(
    session: AsyncSession,
    project: Project,
    envelopes: list[EventEnvelope],
) -> IngestAck:
    issue_ids: list[UUID] = []
    event_ids: list[UUID] = []

    for env in envelopes:
        occurred_at = env.timestamp or datetime.now(UTC)
        redacted = _redact_envelope(env)
        fp = compute_fingerprint(env)
        title, culprit = _describe(env)

        issue = await _upsert_issue(
            session=session,
            project_id=project.id,
            fingerprint=fp,
            title=title,
            culprit=culprit,
            level=_coerce_level(env.level),
            occurred_at=occurred_at,
        )

        event = await _insert_event(
            session=session,
            project_id=project.id,
            issue_id=issue.id,
            env=env,
            redacted=redacted,
            occurred_at=occurred_at,
            fingerprint=fp,
        )
        issue_ids.append(issue.id)
        event_ids.append(event.event_id)

    await session.commit()
    return IngestAck(
        received=len(envelopes),
        issue_ids=issue_ids,
        event_ids=event_ids,
    )


def _redact_envelope(env: EventEnvelope) -> dict:
    """Redact sensitive values inside request/user/contexts/tags/breadcrumbs."""
    dumped = env.model_dump(mode="json")
    for key in ("request", "user", "contexts", "tags", "breadcrumbs"):
        if dumped.get(key) is not None:
            dumped[key] = redact(dumped[key])
    return dumped


def _describe(env: EventEnvelope) -> tuple[str, str | None]:
    if env.exception is not None:
        title = env.exception.type
        if env.exception.value:
            title = f"{env.exception.type}: {env.exception.value}"
        culprit = None
        if env.exception.stacktrace and env.exception.stacktrace.frames:
            top = env.exception.stacktrace.frames[-1]
            culprit = top.function or top.module or top.filename
        return title[:500], (culprit[:500] if culprit else None)
    if env.message:
        return env.message[:500], None
    return "Unknown event", None


def _coerce_level(raw: str) -> Level:
    try:
        return Level(raw)
    except ValueError:
        return Level.ERROR


async def _upsert_issue(
    session: AsyncSession,
    *,
    project_id: UUID,
    fingerprint: str,
    title: str,
    culprit: str | None,
    level: Level,
    occurred_at: datetime,
) -> Issue:
    # Insert-or-update on (project_id, fingerprint). Kept in a single statement
    # so a burst of same-fingerprint events doesn't race.
    stmt = (
        pg_insert(Issue)
        .values(
            project_id=project_id,
            fingerprint=fingerprint,
            title=title,
            culprit=culprit,
            level=level,
            status=IssueStatus.UNRESOLVED,
            first_seen_at=occurred_at,
            last_seen_at=occurred_at,
            event_count=1,
        )
        .on_conflict_do_update(
            constraint="uq_issues_project_fingerprint",
            set_={
                "last_seen_at": occurred_at,
                "event_count": Issue.event_count + 1,
                # if the issue was resolved and a new event lands, mark regressed
                "status": _regression_case(),
            },
        )
        .returning(Issue.id)
    )
    result = await session.execute(stmt)
    issue_id: UUID = result.scalar_one()
    # A follow-up read to hydrate the row for the caller. Cheap.
    issue = await session.get(Issue, issue_id)
    assert issue is not None
    return issue


def _regression_case():
    """Postgres CASE expression: resolved → regressed; else keep status."""
    from sqlalchemy import case, literal

    return case(
        (Issue.status == IssueStatus.RESOLVED, literal(IssueStatus.REGRESSED.value)),
        else_=Issue.status,
    )


async def _insert_event(
    session: AsyncSession,
    *,
    project_id: UUID,
    issue_id: UUID,
    env: EventEnvelope,
    redacted: dict,
    occurred_at: datetime,
    fingerprint: str,
) -> Event:
    browser = env.contexts.get("browser") if isinstance(env.contexts, dict) else None
    os_ctx = env.contexts.get("os") if isinstance(env.contexts, dict) else None

    stmt = (
        pg_insert(Event)
        .values(
            project_id=project_id,
            issue_id=issue_id,
            event_id=env.event_id,
            occurred_at=occurred_at,
            environment=env.environment[:64],
            release=env.release,
            platform=env.platform[:32],
            sdk_name=env.sdk.name if env.sdk else None,
            sdk_version=env.sdk.version if env.sdk else None,
            level=_coerce_level(env.level),
            message=(env.message or None) if env.message is None else env.message[:2000],
            fingerprint=fingerprint,
            exception=redacted.get("exception"),
            stacktrace=(
                redacted["exception"].get("stacktrace")
                if isinstance(redacted.get("exception"), dict)
                else None
            ),
            request=redacted.get("request"),
            user_=redacted.get("user"),
            tags=redacted.get("tags") or {},
            contexts=redacted.get("contexts") or {},
            breadcrumbs=redacted.get("breadcrumbs") or [],
            attachments=[a.model_dump() for a in env.attachments],
            browser_name=(browser or {}).get("name") if isinstance(browser, dict) else None,
            browser_version=(browser or {}).get("version") if isinstance(browser, dict) else None,
            os_name=(os_ctx or {}).get("name") if isinstance(os_ctx, dict) else None,
            os_version=(os_ctx or {}).get("version") if isinstance(os_ctx, dict) else None,
        )
        .on_conflict_do_nothing(constraint="uq_events_project_event_id")
        .returning(Event.id)
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        # duplicate event_id — fetch existing row so we return something coherent
        existing = await session.scalar(
            select(Event).where(
                Event.project_id == project_id, Event.event_id == env.event_id
            )
        )
        assert existing is not None
        return existing
    return await session.get(Event, row)  # type: ignore[return-value]
