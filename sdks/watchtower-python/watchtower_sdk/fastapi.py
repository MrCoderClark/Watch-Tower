"""ASGI middleware for FastAPI / Starlette apps.

Add as the outermost middleware so it wraps the framework's exception layer.
Captures unhandled exceptions AND wraps each HTTP request in a transaction.

    from watchtower_sdk import init
    from watchtower_sdk.fastapi import WatchtowerMiddleware

    init(dsn="http://localhost:8000/wt_pub_xxx", install_excepthook=False)
    app.add_middleware(WatchtowerMiddleware)
"""
from __future__ import annotations

from typing import Any

from . import capture_exception
from .tracing import start_transaction


class WatchtowerMiddleware:
    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "/")
        # Self-monitoring: never wrap ingest calls, or every request the SDK
        # sends becomes a new transaction and we recurse forever.
        if path.startswith("/api/v1/ingest/"):
            await self.app(scope, receive, send)
            return
        # ponytail: raw path, no route-pattern extraction. Route param collapse
        # (/users/{id}) needs the app's router; add when high-cardinality paths
        # start blowing up the transactions list.
        name = f"{method} {path}"

        status_holder: dict[str, int] = {"code": 200}

        async def _send_wrapped(message: dict) -> None:
            if message.get("type") == "http.response.start":
                status_holder["code"] = int(message.get("status", 200))
            await send(message)

        with start_transaction(name, op="http.server") as txn:
            txn.tags = {"method": method, "path": path}
            try:
                await self.app(scope, receive, _send_wrapped)
            except Exception:
                capture_exception()
                txn.finish("internal_error")
                raise
            else:
                code = status_holder["code"]
                txn.tags["status_code"] = code
                if code >= 500:
                    txn.finish("internal_error")
                elif code >= 400:
                    txn.finish("invalid_argument")
