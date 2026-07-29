from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.uptime import UptimeCheckCreate, UptimeCheckOut, UptimeCheckUpdate
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


@router.patch(
    "/projects/{project_slug}/uptime/checks/{check_id}",
    response_model=UptimeCheckOut,
)
async def update_check(
    project_slug: str,
    check_id: UUID,
    data: UptimeCheckUpdate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UptimeCheckOut:
    check = await service.update_check(session, project_slug, user, check_id, data)
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


@router.delete(
    "/projects/{project_slug}/uptime/checks/{check_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_check(
    project_slug: str,
    check_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    await service.delete_check(session, project_slug, user, check_id)
