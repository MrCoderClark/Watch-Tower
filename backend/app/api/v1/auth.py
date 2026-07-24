from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import CurrentUser
from app.db.session import get_session
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserOut
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

REFRESH_COOKIE = "wt_refresh"


def _set_refresh_cookie(response: Response, raw_refresh: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=raw_refresh,
        max_age=settings.refresh_token_days * 24 * 3600,
        httponly=True,
        secure=not settings.is_dev,
        samesite="lax",
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    data: SignupRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AuthResponse:
    result, raw_refresh = await auth_service.signup(session, data)
    _set_refresh_cookie(response, raw_refresh)
    return result


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AuthResponse:
    result, raw_refresh = await auth_service.login(session, data)
    _set_refresh_cookie(response, raw_refresh)
    return result


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    wt_refresh: Annotated[str | None, Cookie()] = None,
) -> AuthResponse:
    if wt_refresh is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing refresh token")
    result, raw_refresh = await auth_service.refresh(session, wt_refresh)
    _set_refresh_cookie(response, raw_refresh)
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    wt_refresh: Annotated[str | None, Cookie()] = None,
) -> None:
    if wt_refresh is not None:
        await auth_service.logout(session, wt_refresh)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
