from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.workspace import OrganizationOut, ProjectCreate, ProjectOut
from app.services import workspace as service

router = APIRouter(tags=["workspace"])


@router.get("/orgs", response_model=list[OrganizationOut])
async def list_orgs(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[OrganizationOut]:
    return await service.list_orgs_for_user(session, user)


@router.get(
    "/orgs/{org_slug}/projects", response_model=list[ProjectOut]
)
async def list_projects(
    org_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProjectOut]:
    return await service.list_projects(session, org_slug, user)


@router.post(
    "/orgs/{org_slug}/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    org_slug: str,
    data: ProjectCreate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectOut:
    return await service.create_project(session, org_slug, user, data)
