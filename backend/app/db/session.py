from collections.abc import AsyncIterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def _prepare_asyncpg_url(url: str) -> tuple[str, dict[str, object]]:
    """Neon hands out libpq-style URLs (sslmode=…, channel_binding=…);
    asyncpg doesn't accept those. Translate to a connect_args ssl flag."""
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    connect_args: dict[str, object] = {}
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    if sslmode in {"require", "verify-ca", "verify-full", "prefer", "allow"}:
        connect_args["ssl"] = True
    clean = urlunsplit(parts._replace(query=urlencode(query)))
    return clean, connect_args


settings = get_settings()
_url, _connect_args = _prepare_asyncpg_url(settings.database_url)

engine = create_async_engine(
    _url,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=1800,  # Neon closes idle sockets ~5min; recycle every 30min
    echo=False,
    connect_args=_connect_args,
)

SessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False,
    class_=AsyncSession,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
