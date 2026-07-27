from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.issues import FrequencyResponse, IssueListResponse, ProjectSummary
from app.services import issues as service

router = APIRouter(tags=["issues"])


@router.get(
    "/projects/{project_slug}/issues", response_model=IssueListResponse
)
async def list_issues(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    status: Annotated[str | None, Query(description="Comma-separated statuses")] = None,
    q: Annotated[str | None, Query(description="Search in title")] = None,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> IssueListResponse:
    statuses = [s.strip() for s in status.split(",")] if status else None
    return await service.list_issues(
        session,
        project_slug,
        user,
        statuses=statuses,
        q=q,
        cursor=cursor,
        limit=limit,
    )


@router.get(
    "/projects/{project_slug}/summary", response_model=ProjectSummary
)
async def project_summary(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectSummary:
    return await service.get_summary(session, project_slug, user)


@router.get(
    "/projects/{project_slug}/frequency", response_model=FrequencyResponse
)
async def project_frequency(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    range: Annotated[str, Query(description="24h | 7d | 30d")] = "24h",
) -> FrequencyResponse:
    return await service.get_frequency(session, project_slug, user, range)
