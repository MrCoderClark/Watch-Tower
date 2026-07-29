"""ASGI middleware for FastAPI / Starlette apps.

Add as the outermost middleware so it wraps the framework's exception layer:

    from watchtower_sdk import init
    from watchtower_sdk.fastapi import WatchtowerMiddleware

    init(dsn="http://localhost:8000/wt_pub_xxx", install_excepthook=False)
    app.add_middleware(WatchtowerMiddleware)
"""
from __future__ import annotations

from typing import Any

from . import capture_exception


class WatchtowerMiddleware:
    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        try:
            await self.app(scope, receive, send)
        except Exception:
            capture_exception()
            raise
