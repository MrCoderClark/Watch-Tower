"""Transaction ingest + read-side queries.

Ingest is a plain bulk insert — no fingerprinting, no grouping (transactions
group by `name` at query time). Reads aggregate on the fly via Postgres
percentile_cont; add materialized rollups if p95 latency ever hurts.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import Select, and_, case, desc, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, Span, Transaction
from app.schemas.transaction import TransactionEnvelope, TransactionIngestAck


def _duration_ms(started: datetime, ended: datetime) -> int:
    return max(0, int((ended - started).total_seconds() * 1000))


async def ingest_transactions(
    session: AsyncSession,
    project: Project,
    envelopes: list[TransactionEnvelope],
) -> TransactionIngestAck:
    txn_ids: list[UUID] = []
    for env in envelopes:
        row_id = await _insert_transaction(session, project.id, env)
        if env.spans:
            await _insert_spans(session, row_id, env.spans)
        txn_ids.append(row_id)
    await session.commit()
    return TransactionIngestAck(received=len(envelopes), transaction_ids=txn_ids)


async def _insert_transaction(
    session: AsyncSession, project_id: UUID, env: TransactionEnvelope
) -> UUID:
    stmt = (
        pg_insert(Transaction)
        .values(
            project_id=project_id,
            trace_id=env.trace_id,
            transaction_id=env.transaction_id,
            name=env.name[:200],
            op=env.op[:64],
            status=env.status[:16],
            environment=env.environment[:64],
            release=env.release,
            sdk_name=env.sdk_name,
            sdk_version=env.sdk_version,
            started_at=env.started_at,
            ended_at=env.ended_at,
            duration_ms=_duration_ms(env.started_at, env.ended_at),
            tags=env.tags,
            measurements=env.measurements,
        )
        .on_conflict_do_nothing(constraint="uq_transactions_project_txn")
        .returning(Transaction.id)
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        existing = await session.scalar(
            select(Transaction.id).where(
                and_(
                    Transaction.project_id == project_id,
                    Transaction.transaction_id == env.transaction_id,
                )
            )
        )
        assert existing is not None
        return existing
    return row


async def _insert_spans(
    session: AsyncSession, transaction_pk: UUID, spans: list
) -> None:
    session.add_all(
        [
            Span(
                transaction_pk=transaction_pk,
                span_id=s.span_id,
                parent_span_id=s.parent_span_id,
                op=s.op[:64],
                description=(s.description or None)
                if s.description is None
                else s.description[:2000],
                started_at=s.started_at,
                ended_at=s.ended_at,
                duration_ms=_duration_ms(s.started_at, s.ended_at),
                data=s.data,
            )
            for s in spans
        ]
    )


# ---- reads ---------------------------------------------------------------


def _project_scope(project_id: UUID, since: datetime) -> Select:
    return select(Transaction).where(
        and_(Transaction.project_id == project_id, Transaction.started_at >= since)
    )


async def list_transactions_aggregated(
    session: AsyncSession, project_id: UUID, hours: int = 24
) -> list[dict]:
    """Group by transaction name; return throughput + p50/p95/p99 + error rate."""
    since = datetime.now(UTC) - timedelta(hours=hours)
    duration = Transaction.duration_ms
    stmt = (
        select(
            Transaction.name,
            Transaction.op,
            func.count().label("count"),
            func.percentile_cont(0.5).within_group(duration).label("p50"),
            func.percentile_cont(0.95).within_group(duration).label("p95"),
            func.percentile_cont(0.99).within_group(duration).label("p99"),
            func.sum(case((Transaction.status != "ok", 1), else_=0)).label(
                "error_count"
            ),
        )
        .where(
            and_(Transaction.project_id == project_id, Transaction.started_at >= since)
        )
        .group_by(Transaction.name, Transaction.op)
        .order_by(desc("p95"))
        .limit(100)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {
            "name": r.name,
            "op": r.op,
            "count": int(r.count),
            "p50_ms": int(r.p50 or 0),
            "p95_ms": int(r.p95 or 0),
            "p99_ms": int(r.p99 or 0),
            "error_rate": (r.error_count or 0) / r.count if r.count else 0.0,
        }
        for r in rows
    ]


async def get_transaction_detail(
    session: AsyncSession, project_id: UUID, transaction_row_id: UUID
) -> dict | None:
    txn = await session.get(Transaction, transaction_row_id)
    if txn is None or txn.project_id != project_id:
        return None
    spans = (
        await session.execute(
            select(Span)
            .where(Span.transaction_pk == txn.id)
            .order_by(Span.started_at)
        )
    ).scalars().all()
    return {
        "id": str(txn.id),
        "trace_id": txn.trace_id,
        "transaction_id": txn.transaction_id,
        "name": txn.name,
        "op": txn.op,
        "status": txn.status,
        "environment": txn.environment,
        "release": txn.release,
        "started_at": txn.started_at,
        "ended_at": txn.ended_at,
        "duration_ms": txn.duration_ms,
        "tags": txn.tags,
        "measurements": txn.measurements,
        "spans": [
            {
                "span_id": s.span_id,
                "parent_span_id": s.parent_span_id,
                "op": s.op,
                "description": s.description,
                "started_at": s.started_at,
                "ended_at": s.ended_at,
                "duration_ms": s.duration_ms,
                "data": s.data,
            }
            for s in spans
        ],
    }


async def list_recent_slow_transactions(
    session: AsyncSession, project_id: UUID, name: str, limit: int = 20
) -> list[dict]:
    since = datetime.now(UTC) - timedelta(hours=24)
    stmt = (
        select(Transaction)
        .where(
            and_(
                Transaction.project_id == project_id,
                Transaction.name == name,
                Transaction.started_at >= since,
            )
        )
        .order_by(desc(Transaction.duration_ms))
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        {
            "id": str(t.id),
            "duration_ms": t.duration_ms,
            "status": t.status,
            "started_at": t.started_at,
        }
        for t in rows
    ]
