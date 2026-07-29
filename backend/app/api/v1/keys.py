from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.keys import ProjectKeyCreate, ProjectKeyCreatedOut, ProjectKeyOut
from app.services import keys as service

router = APIRouter(tags=["keys"])


@router.get(
    "/projects/{project_slug}/keys", response_model=list[ProjectKeyOut]
)
async def list_keys(
    project_slug: str,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProjectKeyOut]:
    return await service.list_keys(session, project_slug, user)


@router.post(
    "/projects/{project_slug}/keys",
    response_model=ProjectKeyCreatedOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_key(
    project_slug: str,
    data: ProjectKeyCreate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectKeyCreatedOut:
    return await service.create_key(session, project_slug, user, data)


@router.delete(
    "/projects/{project_slug}/keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_key(
    project_slug: str,
    key_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    await service.revoke_key(session, project_slug, user, key_id)
