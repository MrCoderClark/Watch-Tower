"""Watchtower Python SDK — minimal capture surface.

Envelope shape lives in backend/app/schemas/envelope.py; keep in sync.
"""
from __future__ import annotations

import atexit
import sys
import threading
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import urlparse

import httpx

from .tracing import Transaction, start_span, start_transaction  # noqa: F401

__version__ = "0.1.0"
_SDK_INFO = {"name": "watchtower.python", "version": __version__}

_cfg: dict[str, Any] | None = None
_client: httpx.Client | None = None

# Batching: append to per-endpoint queues, flush every FLUSH_INTERVAL_S or
# whenever a queue hits FLUSH_MAX. Cuts self-monitoring pressure ~30x under
# load — critical when dogfooding on the backend itself, or Neon's connection
# pool (5 base + 10 overflow) exhausts on burst traffic.
_FLUSH_INTERVAL_S = 5.0
_FLUSH_MAX = 30
_queue_lock = threading.Lock()
_queues: dict[str, list[dict]] = {"events": [], "transactions": []}
_flush_thread: threading.Thread | None = None


def init(
    dsn: str,
    environment: str = "production",
    release: str | None = None,
    before_send: Callable[[dict], dict | None] | None = None,
    install_excepthook: bool = True,
) -> None:
    """Configure the SDK. Call once at process start."""
    global _cfg, _client
    parsed = urlparse(dsn)
    key = parsed.path.strip("/").split("/")[-1]
    if not key:
        raise ValueError("Watchtower: DSN missing project key")
    _cfg = {
        "url": f"{parsed.scheme}://{parsed.netloc}/api/v1/ingest/events",
        "key": key,
        "environment": environment,
        "release": release,
        "before_send": before_send,
    }
    _client = httpx.Client(timeout=5.0)
    _ensure_flusher()
    atexit.register(_drain_and_close)

    if install_excepthook:
        prior = sys.excepthook

        def hook(exc_type, exc, tb):  # type: ignore[no-untyped-def]
            capture_exception((exc_type, exc, tb))
            prior(exc_type, exc, tb)

        sys.excepthook = hook


def _frames_from_tb(tb: Any) -> list[dict]:
    return [
        {
            "function": f.name,
            "filename": f.filename,
            "lineno": f.lineno,
            "context_line": f.line,
        }
        for f in traceback.extract_tb(tb)
    ]


def _build(overrides: dict) -> dict:
    assert _cfg is not None
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": _cfg["environment"],
        "release": _cfg["release"],
        "platform": "python",
        "sdk": _SDK_INFO,
        "level": "error",
        **overrides,
    }


def _endpoint_url(kind: str) -> str:
    assert _cfg is not None
    return _cfg["url"] if kind == "events" else _cfg["url"].replace(
        "/events", "/transactions"
    )


def _enqueue(kind: str, envelope: dict) -> None:
    """Append to the queue; if the queue crosses FLUSH_MAX, flush immediately
    on a daemon thread. Otherwise the periodic flusher drains it within
    FLUSH_INTERVAL_S."""
    if _cfg is None:
        return
    to_flush: list[dict] | None = None
    with _queue_lock:
        _queues[kind].append(envelope)
        if len(_queues[kind]) >= _FLUSH_MAX:
            to_flush = _queues[kind]
            _queues[kind] = []
    if to_flush:
        threading.Thread(
            target=_do_post, args=(kind, to_flush), daemon=True
        ).start()


def _do_post(kind: str, batch: list[dict]) -> None:
    if not batch or _cfg is None or _client is None:
        return
    try:
        _client.post(
            _endpoint_url(kind),
            headers={"X-Watchtower-Key": _cfg["key"]},
            json=batch,
        )
    except Exception:
        pass


def _flush_loop() -> None:
    while True:
        time.sleep(_FLUSH_INTERVAL_S)
        _flush_all()


def _flush_all() -> None:
    with _queue_lock:
        events = _queues["events"]
        transactions = _queues["transactions"]
        _queues["events"] = []
        _queues["transactions"] = []
    _do_post("events", events)
    _do_post("transactions", transactions)


def _ensure_flusher() -> None:
    global _flush_thread
    if _flush_thread is not None and _flush_thread.is_alive():
        return
    _flush_thread = threading.Thread(target=_flush_loop, daemon=True)
    _flush_thread.start()


def _drain_and_close() -> None:
    _flush_all()
    if _client is not None:
        _client.close()


def _send(event: dict) -> None:
    if _cfg is None:
        return
    final = _cfg["before_send"](event) if _cfg["before_send"] else event
    if final is None:
        return
    _enqueue("events", final)


def _send_transaction(txn: Transaction) -> None:
    if _cfg is None:
        return
    envelope = txn.to_envelope(
        environment=_cfg["environment"],
        release=_cfg["release"],
        sdk=_SDK_INFO,
    )
    _enqueue("transactions", envelope)


def capture_exception(exc_info: Any = None) -> str | None:
    """Capture the current or supplied exception. Returns event_id or None."""
    if _cfg is None:
        return None
    if exc_info is None:
        exc_info = sys.exc_info()
    exc_type, exc, tb = exc_info
    if exc is None:
        return None
    event = _build(
        {
            "message": str(exc),
            "exception": {
                "type": exc_type.__name__ if exc_type else "Exception",
                "value": str(exc),
                "module": getattr(exc_type, "__module__", None),
                "stacktrace": {"frames": _frames_from_tb(tb)} if tb else None,
            },
        }
    )
    _send(event)
    return event["event_id"]


def capture_message(message: str, level: str = "info") -> str | None:
    if _cfg is None:
        return None
    event = _build({"message": message, "level": level})
    _send(event)
    return event["event_id"]


# Test hook — not part of public API.
def _reset() -> None:
    global _cfg, _client
    _cfg = None
    _client = None
