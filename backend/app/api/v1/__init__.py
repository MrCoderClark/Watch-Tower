from fastapi import APIRouter

from app.api.v1 import auth, ingest, issues, keys, logs, transactions, uptime, workspace

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(workspace.router)
api_router.include_router(keys.router)
api_router.include_router(issues.router)
api_router.include_router(transactions.router)
api_router.include_router(uptime.router)
api_router.include_router(logs.router)
api_router.include_router(ingest.router)
