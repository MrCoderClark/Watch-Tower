"""Transactions + spans. Envelope shape lives in
backend/app/schemas/transaction.py; keep in sync."""
from __future__ import annotations

import contextlib
import secrets
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _hex(n_bytes: int) -> str:
    return secrets.token_hex(n_bytes)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Span:
    span_id: str
    parent_span_id: str | None
    op: str
    description: str | None
    started_at: datetime
    ended_at: datetime | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def finish(self, status: str | None = None) -> None:
        self.ended_at = _now()
        if status:
            self.data["status"] = status

    def to_envelope(self) -> dict:
        return {
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "op": self.op,
            "description": self.description,
            "started_at": self.started_at.isoformat(),
            "ended_at": (self.ended_at or _now()).isoformat(),
            "data": self.data,
        }


@dataclass
class Transaction:
    trace_id: str
    transaction_id: str
    name: str
    op: str
    started_at: datetime
    status: str = "ok"
    ended_at: datetime | None = None
    tags: dict[str, Any] = field(default_factory=dict)
    measurements: dict[str, Any] = field(default_factory=dict)
    spans: list[Span] = field(default_factory=list)
    _current_span_stack: list[str] = field(default_factory=list)

    def finish(self, status: str = "ok") -> None:
        self.ended_at = _now()
        self.status = status

    def start_span(self, op: str, description: str | None = None) -> Span:
        parent = self._current_span_stack[-1] if self._current_span_stack else None
        span = Span(
            span_id=_hex(8),
            parent_span_id=parent,
            op=op,
            description=description,
            started_at=_now(),
        )
        self.spans.append(span)
        return span

    def to_envelope(self, *, environment: str, release: str | None, sdk: dict) -> dict:
        return {
            "trace_id": self.trace_id,
            "transaction_id": self.transaction_id,
            "name": self.name[:200],
            "op": self.op[:64],
            "status": self.status[:16],
            "environment": environment[:64],
            "release": release,
            "sdk_name": sdk["name"],
            "sdk_version": sdk["version"],
            "started_at": self.started_at.isoformat(),
            "ended_at": (self.ended_at or _now()).isoformat(),
            "tags": self.tags,
            "measurements": self.measurements,
            "spans": [s.to_envelope() for s in self.spans],
        }


current_transaction: ContextVar[Transaction | None] = ContextVar(
    "watchtower_current_transaction", default=None
)


@contextlib.contextmanager
def start_transaction(name: str, op: str = "task"):
    """Context manager. Wraps a block in a transaction; sends on exit."""
    from . import _send_transaction  # avoid import cycle at module load

    txn = Transaction(
        trace_id=_hex(16),
        transaction_id=_hex(8),
        name=name,
        op=op,
        started_at=_now(),
    )
    token = current_transaction.set(txn)
    try:
        yield txn
        txn.finish("ok")
    except Exception:
        txn.finish("internal_error")
        raise
    finally:
        current_transaction.reset(token)
        _send_transaction(txn)


@contextlib.contextmanager
def start_span(op: str, description: str | None = None):
    """Context manager. Adds a span to the current transaction (no-op if none)."""
    txn = current_transaction.get()
    if txn is None:
        yield None
        return
    span = txn.start_span(op, description)
    txn._current_span_stack.append(span.span_id)
    try:
        yield span
    finally:
        span.finish()
        txn._current_span_stack.pop()
