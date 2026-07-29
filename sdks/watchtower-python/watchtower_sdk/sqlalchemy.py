"""SQLAlchemy integration: wrap each query in a db.query span.

    from sqlalchemy.ext.asyncio import create_async_engine
    from watchtower_sdk.sqlalchemy import instrument_engine

    engine = create_async_engine(...)
    instrument_engine(engine)
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import event

from .tracing import current_transaction, start_span


def instrument_engine(engine: Any) -> None:
    """Attach before/after cursor-execute hooks that emit db.query spans."""
    sync_engine = getattr(engine, "sync_engine", engine)

    @event.listens_for(sync_engine, "before_cursor_execute")
    def _before(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001
        if current_transaction.get() is None:
            return
        # ponytail: truncate at 500 chars; queries with giant IN () lists blow
        # up otherwise. Full text lives in the DB logs if you need it.
        context._wt_span_cm = start_span("db.query", statement[:500])
        context._wt_span = context._wt_span_cm.__enter__()

    @event.listens_for(sync_engine, "after_cursor_execute")
    def _after(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001
        cm = getattr(context, "_wt_span_cm", None)
        if cm is not None:
            cm.__exit__(None, None, None)
