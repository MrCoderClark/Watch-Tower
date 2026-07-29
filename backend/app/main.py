from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.session import engine, get_session
from watchtower_sdk import init as wt_init
from watchtower_sdk.fastapi import WatchtowerMiddleware
from watchtower_sdk.sqlalchemy import instrument_engine as wt_instrument_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


settings = get_settings()

app = FastAPI(
    title="Watchtower API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_dev else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.internal_dsn:
    wt_init(dsn=settings.internal_dsn, environment=settings.environment, install_excepthook=False)
    app.add_middleware(WatchtowerMiddleware)
    wt_instrument_engine(engine)

app.include_router(api_router)


@app.get("/api/v1/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, object]:
    db_ok = False
    try:
        result = await session.execute(text("SELECT 1"))
        db_ok = result.scalar_one() == 1
    except Exception:
        db_ok = False
    return {"ok": True, "db": db_ok, "environment": settings.environment}
