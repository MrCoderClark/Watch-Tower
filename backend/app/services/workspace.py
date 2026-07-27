from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership, Organization, Project, User
from app.schemas.workspace import OrganizationOut, ProjectCreate, ProjectOut
from app.utils.slug import slugify


async def list_orgs_for_user(session: AsyncSession, user: User) -> list[OrganizationOut]:
    rows = (
        await session.execute(
            select(Organization, Membership.role)
            .join(Membership, Membership.organization_id == Organization.id)
            .where(Membership.user_id == user.id)
            .order_by(Organization.created_at)
        )
    ).all()
    return [
        OrganizationOut.model_validate(
            {**org.__dict__, "role": role},
        )
        for org, role in rows
    ]


async def _resolve_org_for_user(
    session: AsyncSession, org_slug: str, user: User
) -> Organization:
    org = await session.scalar(
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Organization.slug == org_slug, Membership.user_id == user.id)
    )
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return org


async def list_projects(
    session: AsyncSession, org_slug: str, user: User
) -> list[ProjectOut]:
    org = await _resolve_org_for_user(session, org_slug, user)
    projects = (
        await session.scalars(
            select(Project)
            .where(Project.organization_id == org.id)
            .order_by(Project.created_at)
        )
    ).all()
    return [ProjectOut.model_validate(p) for p in projects]


async def create_project(
    session: AsyncSession, org_slug: str, user: User, data: ProjectCreate
) -> ProjectOut:
    org = await _resolve_org_for_user(session, org_slug, user)
    slug = await _unique_project_slug(session, org.id, data.name)
    project = Project(
        organization_id=org.id,
        slug=slug,
        name=data.name,
        platform=data.platform,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return ProjectOut.model_validate(project)


async def _unique_project_slug(
    session: AsyncSession, org_id: UUID, name: str
) -> str:
    base = slugify(name)
    for suffix in range(0, 20):
        candidate = base if suffix == 0 else f"{base}-{suffix}"
        exists = await session.scalar(
            select(Project.id).where(
                Project.organization_id == org_id, Project.slug == candidate
            )
        )
        if exists is None:
            return candidate
    # ponytail: 20 collisions is unrealistic; random fallback
    import secrets

    return f"{base}-{secrets.token_hex(3)}"
