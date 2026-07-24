from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models import Membership, Organization, RefreshToken, Role, User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.utils.slug import slugify


async def signup(session: AsyncSession, data: SignupRequest) -> tuple[AuthResponse, str]:
    existing = await session.scalar(select(User).where(User.email == data.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(email=data.email, name=data.name, password_hash=hash_password(data.password))
    session.add(user)
    await session.flush()

    org = Organization(name=f"{data.name}'s Personal", slug=await _unique_org_slug(session, data.name))
    session.add(org)
    await session.flush()

    session.add(Membership(organization_id=org.id, user_id=user.id, role=Role.OWNER))

    tokens = await _issue_tokens(session, user)
    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from e
    await session.refresh(user)
    return tokens


async def login(session: AsyncSession, data: LoginRequest) -> tuple[AuthResponse, str]:
    user = await session.scalar(select(User).where(User.email == data.email))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    tokens = await _issue_tokens(session, user)
    await session.commit()
    return tokens


async def refresh(session: AsyncSession, raw_refresh_token: str) -> tuple[AuthResponse, str]:
    token_hash = hash_refresh_token(raw_refresh_token)
    record = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    now = datetime.now(UTC)
    if record is None or record.revoked_at is not None or record.expires_at < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = await session.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    record.revoked_at = now
    tokens = await _issue_tokens(session, user)
    await session.commit()
    return tokens


async def logout(session: AsyncSession, raw_refresh_token: str) -> None:
    token_hash = hash_refresh_token(raw_refresh_token)
    record = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if record is not None and record.revoked_at is None:
        record.revoked_at = datetime.now(UTC)
        await session.commit()


async def _issue_tokens(session: AsyncSession, user: User) -> tuple[AuthResponse, str]:
    access_token, access_exp = create_access_token(str(user.id))
    raw_refresh, refresh_hash, refresh_exp = generate_refresh_token()
    session.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=refresh_exp))
    response = AuthResponse(
        user=UserOut.model_validate(user),
        token=TokenResponse(access_token=access_token, expires_at=access_exp),
    )
    return response, raw_refresh


async def _unique_org_slug(session: AsyncSession, name: str) -> str:
    base = slugify(name)
    slug = base
    for suffix in range(0, 20):
        candidate = slug if suffix == 0 else f"{base}-{suffix}"
        exists = await session.scalar(select(Organization.id).where(Organization.slug == candidate))
        if exists is None:
            return candidate
    # ponytail: 20 collisions on a personal-org slug is unrealistic; if it happens, fall back to random
    import secrets

    return f"{base}-{secrets.token_hex(3)}"
