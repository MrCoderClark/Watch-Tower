# Logging

Centralized structured logs, correlated with errors and transactions.

## Envelope

```json
{
  "event_id": "uuid v4",
  "timestamp": "ISO8601",
  "level": "info|debug|warn|error|fatal",
  "service": "api",
  "message": "user logged in",
  "attributes": { "user_id": "42", "route": "/login" },
  "trace_id": "hex 32 or null",
  "span_id": "hex 16 or null"
}
```

Batches accepted at `POST /api/v1/ingest/logs`. Same auth/rate-limit/redact
pipeline as events.

## Storage

Single `logs` table, partitioned by month (`partman`-free — Alembic creates
`logs_YYYY_MM` monthly via a scheduled task).

Full-text search via `search_vector tsvector` GIN index. Attribute filters use a
GIN index on `attributes jsonb_path_ops`.

Retention: per-project setting, default 30 days. A nightly task drops partitions
whose `to_char(range, 'YYYY-MM')` is older.

`ponytail: monthly partitions in Postgres, migrate to ClickHouse when p95 query
latency > 2s on a >200GB corpus`.

## Query API

```
GET /api/v1/projects/{project}/logs
    ?q=free text
    &level=error
    &service=api
    &trace_id=...
    &from=ISO&to=ISO
    &cursor=opaque
    &limit=100
```

Cursor is a `(occurred_at, id)` pair, encoded — no offset pagination.

## Correlation

- On an issue's event detail page, "Related logs" panel: same `trace_id` within
  ±30s.
- On a transaction detail page, logs pinned to the transaction's `trace_id`.
- On a log line, click `trace_id` → transaction; click `event_id` in attributes
  → issue.

## Views

- Logs viewer: virtualized scroll, sticky filter bar, saved views per project.
- Live tail toggle: SSE from `/api/v1/projects/{project}/logs/stream?filter=...`.

## Files this spec adds

```
backend/app/api/v1/logs.py
backend/app/services/logs.py
backend/app/monitoring/log_partitioner.py
frontend/src/app/projects/[slug]/logs/page.tsx
frontend/src/components/logs/*
```
