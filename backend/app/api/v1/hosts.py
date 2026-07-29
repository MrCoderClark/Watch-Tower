from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.infra import HostMetricsSeries, HostOut
from app.services import infra as service

router = APIRouter(tags=["infra"])


@router.get("/projects/{project_slug}/hosts", response_model=list[HostOut])
async def list_hosts(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[HostOut]:
    return await service.list_hosts(session, project_slug, user)


@router.get(
    "/projects/{project_slug}/hosts/{host_id}/metrics",
    response_model=HostMetricsSeries,
)
async def get_host_metrics(
    project_slug: str,
    host_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    metric: Annotated[str, Query()] = "cpu_pct",
    range: Annotated[str, Query()] = "1h",
) -> HostMetricsSeries:
    return await service.get_host_metrics(
        session, project_slug, user, host_id, metric, range
    )
