"""logging.Handler that ships records to /api/v1/ingest/logs.

    import logging
    from watchtower_sdk import init
    from watchtower_sdk.logging import WatchtowerLogHandler

    init(dsn="http://localhost:8000/wt_pub_xxx")
    logging.getLogger().addHandler(WatchtowerLogHandler())
    logging.getLogger().setLevel(logging.INFO)
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from . import _enqueue
from .tracing import current_transaction

_LEVEL_MAP = {
    "DEBUG": "debug",
    "INFO": "info",
    "WARNING": "warning",
    "ERROR": "error",
    "CRITICAL": "fatal",
}


def _attrs(record: logging.LogRecord) -> dict[str, Any]:
    # Non-reserved LogRecord fields land in `attributes` for querying later.
    reserved = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "message", "asctime",
    }
    return {k: v for k, v in record.__dict__.items() if k not in reserved}


class WatchtowerLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:  # noqa: D401
        # `_enqueue` short-circuits when the SDK isn't initialized.
        try:
            txn = current_transaction.get()
            envelope = {
                "event_id": str(uuid.uuid4()),
                "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                "level": _LEVEL_MAP.get(record.levelname, record.levelname.lower()),
                "service": record.name[:64],
                "message": self.format(record),
                "attributes": _attrs(record),
                "trace_id": txn.trace_id if txn else None,
                "span_id": None,
            }
            _enqueue("logs", envelope)
        except Exception:
            self.handleError(record)
