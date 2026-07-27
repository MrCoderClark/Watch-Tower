from fastapi import APIRouter

from app.api.v1 import auth, ingest, keys, workspace

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(workspace.router)
api_router.include_router(keys.router)
api_router.include_router(ingest.router)
