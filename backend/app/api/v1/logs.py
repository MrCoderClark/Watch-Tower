from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.logs import LogListResponse
from app.services import logs as service

router = APIRouter(tags=["logs"])


@router.get("/projects/{project_slug}/logs", response_model=LogListResponse)
async def list_logs(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    q: Annotated[str | None, Query()] = None,
    level: Annotated[str | None, Query()] = None,
    service_: Annotated[str | None, Query(alias="service")] = None,
    trace_id: Annotated[str | None, Query()] = None,
    from_ts: Annotated[datetime | None, Query(alias="from")] = None,
    to_ts: Annotated[datetime | None, Query(alias="to")] = None,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> LogListResponse:
    return await service.list_logs(
        session,
        project_slug,
        user,
        q=q,
        level=level,
        service=service_,
        trace_id=trace_id,
        from_ts=from_ts,
        to_ts=to_ts,
        cursor=cursor,
        limit=limit,
    )
