import hashlib
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KeyKind, Membership, Organization, Project, ProjectKey, User
from app.schemas.keys import ProjectKeyCreate, ProjectKeyCreatedOut, ProjectKeyOut


def _new_plaintext(kind: str) -> tuple[str, str, str]:
    """Returns (plaintext, hash, prefix). Prefix is stored/displayed;
    plaintext is only returned once at creation."""
    secret = secrets.token_urlsafe(32)
    prefix = f"wt_{'pub' if kind == KeyKind.PUBLIC else 'sec'}"
    plaintext = f"{prefix}_{secret}"
    return plaintext, hashlib.sha256(plaintext.encode()).hexdigest(), f"{prefix}_{secret[:6]}"


async def _resolve_project(
    session: AsyncSession, project_slug: str, user: User
) -> Project:
    project = await session.scalar(
        select(Project)
        .join(Organization, Organization.id == Project.organization_id)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Project.slug == project_slug, Membership.user_id == user.id)
    )
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


async def list_keys(
    session: AsyncSession, project_slug: str, user: User
) -> list[ProjectKeyOut]:
    project = await _resolve_project(session, project_slug, user)
    keys = (
        await session.scalars(
            select(ProjectKey)
            .where(ProjectKey.project_id == project.id)
            .order_by(ProjectKey.created_at)
        )
    ).all()
    return [ProjectKeyOut.model_validate(k) for k in keys]


async def create_key(
    session: AsyncSession,
    project_slug: str,
    user: User,
    data: ProjectKeyCreate,
) -> ProjectKeyCreatedOut:
    project = await _resolve_project(session, project_slug, user)
    plaintext, key_hash, key_prefix = _new_plaintext(data.kind)
    key = ProjectKey(
        project_id=project.id,
        kind=data.kind,
        key_hash=key_hash,
        key_prefix=key_prefix,
        label=data.label,
    )
    session.add(key)
    await session.commit()
    await session.refresh(key)
    return ProjectKeyCreatedOut(
        **ProjectKeyOut.model_validate(key).model_dump(),
        plaintext=plaintext,
    )


async def revoke_key(
    session: AsyncSession, project_slug: str, user: User, key_id: UUID
) -> None:
    from datetime import UTC, datetime

    project = await _resolve_project(session, project_slug, user)
    key = await session.scalar(
        select(ProjectKey).where(
            ProjectKey.id == key_id, ProjectKey.project_id == project.id
        )
    )
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Key not found")
    if key.revoked_at is not None:
        return
    key.revoked_at = datetime.now(UTC)
    await session.commit()


async def resolve_project_by_key(
    session: AsyncSession, plaintext: str
) -> tuple[Project, ProjectKey]:
    """Ingest-side lookup. Returns the project + key, or raises 401."""
    key_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    key = await session.scalar(
        select(ProjectKey).where(ProjectKey.key_hash == key_hash)
    )
    if key is None or key.revoked_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or revoked project key")
    project = await session.get(Project, key.project_id)
    if project is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Project not found")
    return project, key
