# Performance monitoring

Transaction-and-span model. Not a full distributed-tracing product — a pragmatic
subset that answers "what's slow in my app right now".

## Envelope

```json
{
  "trace_id": "hex 32",
  "transaction_id": "hex 16",
  "parent_span_id": null,
  "name": "GET /api/checkout",
  "op": "http.server",
  "status": "ok",
  "environment": "production",
  "release": "1.4.2",
  "started_at": "ISO8601",
  "ended_at": "ISO8601",
  "tags": { "endpoint": "/api/checkout", "method": "GET" },
  "measurements": { "fcp": 820, "lcp": 1240, "cls": 0.02, "ttfb": 130 },
  "spans": [
    { "span_id":"...", "parent_span_id":"...", "op":"db.query",
      "description":"SELECT * FROM users WHERE id = $1",
      "started_at":"...", "ended_at":"...", "data": {...} }
  ]
}
```

`measurements` is where Core Web Vitals live for browser transactions.

## Server-side capture (Python SDK)

FastAPI middleware wraps each request in a transaction; SQLAlchemy events wrap
each query in a `db.query` span; the SDK exposes `start_span(op, description)` for
manual instrumentation. Background jobs use the same `start_transaction` API.

## Client-side capture (JS SDK)

- Page load transaction from `PerformanceObserver` navigation entries.
- Route change transactions in Next.js via a client-side router listener.
- Core Web Vitals via `web-vitals` (peer dep; SDK doesn't bundle it).
- Fetch/XHR instrumentation adds `http.client` spans and propagates `sentry-trace`
  headers (Watchtower-compatible header name: `watchtower-trace`).

## Views

- **Transactions list** per project, group by `name`, columns: throughput, p50,
  p95, p99, error rate, apdex.
- **Transaction detail**: trend chart (24h/7d), slowest recent transactions,
  span breakdown by op.
- **Single transaction**: flame graph of spans (SVG, no heavy chart lib).
- **Web Vitals** view per route.

## Slow-transaction alerts

Rule kinds added in `alerting.md`: "p95 of transaction X > threshold",
"apdex of project < threshold".

## Sampling

SDK samples at `tracesSampleRate` (default 0.1). Server accepts 100% of what
arrives — sampling happens on the client. Sampled-out transactions still contribute
to error rate via a separate lightweight `POST /api/v1/ingest/transactions/stub`?
No — skip that. If it's not sampled, it doesn't exist. `ponytail: client sampling
only, add head-based server sampling if the storage cost bites`.

## Files this spec adds

```
backend/app/api/v1/transactions.py
backend/app/services/transactions.py
frontend/src/app/projects/[slug]/performance/page.tsx
frontend/src/app/projects/[slug]/performance/[id]/page.tsx
frontend/src/components/performance/flamegraph.tsx
```
