from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.models import Membership, Project
from app.services import transactions as service

router = APIRouter(tags=["performance"])


async def _project_for_user(
    session: AsyncSession, project_slug: str, user_id: UUID
) -> Project:
    stmt = (
        select(Project)
        .join(Membership, Membership.organization_id == Project.organization_id)
        .where(Project.slug == project_slug, Membership.user_id == user_id)
    )
    project = await session.scalar(stmt)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


@router.get("/projects/{project_slug}/transactions")
async def list_transactions(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    hours: Annotated[int, Query(ge=1, le=720)] = 24,
) -> list[dict]:
    project = await _project_for_user(session, project_slug, user.id)
    return await service.list_transactions_aggregated(session, project.id, hours)


@router.get("/projects/{project_slug}/transactions/{transaction_id}")
async def get_transaction(
    project_slug: str,
    transaction_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    project = await _project_for_user(session, project_slug, user.id)
    detail = await service.get_transaction_detail(session, project.id, transaction_id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    return detail


@router.get("/projects/{project_slug}/transactions-by-name")
async def slowest_by_name(
    project_slug: str,
    name: Annotated[str, Query(min_length=1)],
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict]:
    project = await _project_for_user(session, project_slug, user.id)
    return await service.list_recent_slow_transactions(session, project.id, name)
