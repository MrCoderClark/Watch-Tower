# Ingest API

The write path SDKs and agents hit. Optimized for cheap, safe, high-volume writes.

## Endpoints

```
POST /api/v1/ingest/events        # errors
POST /api/v1/ingest/transactions  # performance
POST /api/v1/ingest/logs          # structured logs (batch)
POST /api/v1/ingest/metrics       # infra agent
POST /api/v1/ingest/attachments   # multipart, links to event_id
```

All accept a batch (`[...]`) so SDKs can flush multiple events per request.

## Authentication

Header: `X-Watchtower-Key: wt_pub_xxx` or `wt_sec_xxx`.

- Public keys: allowed on `events`, `transactions`, `logs` (browser SDKs).
- Secret keys: allowed on everything, including `metrics` and `attachments`.
- Keys resolve to a project; keys carry an org id — all rows are stamped with
  `project_id` at insert time, never trusted from the client.

## Envelope

```json
{
  "event_id": "uuid v4",
  "timestamp": "ISO8601",
  "environment": "production",
  "release": "1.4.2",
  "platform": "javascript",
  "sdk": { "name": "watchtower.browser", "version": "0.1.0" },
  "level": "error",
  "message": "TypeError: ...",
  "exception": { "type": "TypeError", "value": "...", "stacktrace": {...} },
  "request": { "url": "...", "method": "POST", "headers": {...}, "data": {...} },
  "user": { "id": "...", "email": "...", "ip_address": "..." },
  "tags": { "feature": "checkout" },
  "contexts": { "browser": {...}, "os": {...}, "device": {...} },
  "breadcrumbs": [ { "timestamp": "...", "category": "...", "message": "..." } ],
  "attachments": [ { "id": "...", "filename": "...", "size": 123 } ]
}
```

Transactions and logs each have their own envelope; see `performance.md` and
`logging.md`.

## Pipeline

`app/monitoring/pipeline.py`:

```
raw request
  → validate (Pydantic)
  → auth (resolve key → project)
  → rate-limit (per project, per key kind)
  → redact (app/monitoring/redact.py)
  → fingerprint (errors only, app/monitoring/fingerprint.py)
  → persist (bulk insert)
  → NOTIFY 'events_new' with project_id
  → 202 Accepted
```

Nothing here does synchronous fan-out to alert channels. That's the alert worker's
job (`alerting.md`).

## Redaction

`app/monitoring/redact.py` walks the payload and masks:

- Header keys: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `proxy-*`.
- Body keys matching `password|token|secret|api[_-]?key|authorization|ssn|credit[_-]?card`.
- Query string params matching the same set.
- Values matching a credit-card Luhn check or JWT shape.

Redaction is applied before persistence, not before display. There is no un-redact.

## Fingerprinting

Default (in order of preference):

1. `exception.stacktrace.frames[-3:]` normalized (drop line numbers, keep function
   + module).
2. `exception.type + message` if no stacktrace.
3. `message` if no exception.

SDKs may override via `event.fingerprint: string[]`. Custom fingerprints are hashed
verbatim.

Hash algorithm: `blake2b(digest_size=16)` → hex. Not cryptographically load-bearing,
just needs to be stable and fast.

## Rate limits

Per project, per key kind, sliding window in Postgres (revisit with Redis only if
this shows up in profiles):

- public key: 300 req/min, 10k events/min.
- secret key: 1000 req/min, 100k events/min.

Over the limit → 429 with `Retry-After`.

## Idempotency

`(project_id, event_id)` unique; conflicts return the existing row's id, not an
error. SDKs may retry safely.

## Attachments

Multipart POST. Stored on disk (dev) or S3-compatible bucket (prod) — path is an
env var. `attachments` table stores metadata only. Size cap: 20MB per file, 100MB
per event.

## Files this spec adds

```
backend/app/api/v1/ingest.py           # routes
backend/app/monitoring/pipeline.py     # orchestration
backend/app/monitoring/redact.py
backend/app/monitoring/fingerprint.py
backend/app/monitoring/ratelimit.py
backend/app/schemas/envelope.py        # Pydantic models
backend/app/services/events.py         # persistence
```
