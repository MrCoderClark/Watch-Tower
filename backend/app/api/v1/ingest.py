from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import Project
from app.monitoring.pipeline import ingest_events
from app.schemas.envelope import EventEnvelope, IngestAck
from app.services import keys as key_service

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
