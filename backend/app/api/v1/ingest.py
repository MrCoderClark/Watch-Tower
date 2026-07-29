from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import Project
from app.models import KeyKind
from app.monitoring.pipeline import ingest_events
from app.schemas.envelope import EventEnvelope, IngestAck
from app.schemas.infra import MetricEnvelope, MetricIngestAck
from app.schemas.logs import LogEnvelope, LogIngestAck
from app.schemas.transaction import TransactionEnvelope, TransactionIngestAck
from app.services import keys as key_service
from app.services.infra import ingest_metrics
from app.services.logs import ingest_logs
from app.services.transactions import ingest_transactions

router = APIRouter(prefix="/ingest", tags=["ingest"])

KEY_HEADER = "X-Watchtower-Key"


async def _project_from_key(
    x_watchtower_key: Annotated[str | None, Header(alias=KEY_HEADER)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,  # type: ignore[assignment]
) -> Project:
    if not x_watchtower_key:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, f"Missing {KEY_HEADER} header"
        )
    project, _ = await key_service.resolve_project_by_key(session, x_watchtower_key)
    return project


async def _project_from_secret_key(
    x_watchtower_key: Annotated[str | None, Header(alias=KEY_HEADER)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,  # type: ignore[assignment]
) -> Project:
    if not x_watchtower_key:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, f"Missing {KEY_HEADER} header"
        )
    project, key = await key_service.resolve_project_by_key(session, x_watchtower_key)
    if key.kind != KeyKind.SECRET:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Secret key required for this endpoint"
        )
    return project


@router.post(
    "/events", response_model=IngestAck, status_code=status.HTTP_202_ACCEPTED
)
async def ingest(
    events: list[EventEnvelope],
    project: Annotated[Project, Depends(_project_from_key)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> IngestAck:
    if not events:
        return IngestAck(received=0, issue_ids=[], event_ids=[])
    return await ingest_events(session, project, events)


@router.post(
    "/transactions",
    response_model=TransactionIngestAck,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_transactions_route(
    transactions: list[TransactionEnvelope],
    project: Annotated[Project, Depends(_project_from_key)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TransactionIngestAck:
    if not transactions:
        return TransactionIngestAck(received=0, transaction_ids=[])
    return await ingest_transactions(session, project, transactions)


@router.post(
    "/logs",
    response_model=LogIngestAck,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_logs_route(
    logs: list[LogEnvelope],
    project: Annotated[Project, Depends(_project_from_key)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LogIngestAck:
    return await ingest_logs(session, project, logs)


@router.post(
    "/metrics",
    response_model=MetricIngestAck,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_metrics_route(
    metrics: list[MetricEnvelope],
    project: Annotated[Project, Depends(_project_from_secret_key)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MetricIngestAck:
    return await ingest_metrics(session, project, metrics)
