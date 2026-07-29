from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.uptime import UptimeCheckCreate, UptimeCheckOut
from app.services import uptime as service

router = APIRouter(tags=["uptime"])


@router.get("/projects/{project_slug}/uptime/checks", response_model=list[UptimeCheckOut])
async def list_checks(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[UptimeCheckOut]:
    return await service.list_checks(session, project_slug, user)


@router.post(
    "/projects/{project_slug}/uptime/checks",
    response_model=UptimeCheckOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_check(
    project_slug: str,
    data: UptimeCheckCreate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UptimeCheckOut:
    check = await service.create_check(session, project_slug, user, data)
    return UptimeCheckOut(
        id=check.id,
        name=check.name,
        url=check.url,
        interval_seconds=check.interval_seconds,
        is_enabled=check.is_enabled,
        last_status=check.last_status,
        consecutive_failures=check.consecutive_failures,
        last_checked_at=check.last_checked_at,
    )
