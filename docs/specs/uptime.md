# Uptime monitoring

Black-box synthetic checks. Runs from a single worker for now.

## Check kinds

| kind    | target format               | notes |
|---------|-----------------------------|-------|
| http    | `http://...`                | expects 2xx unless overridden |
| https   | `https://...`               | also inspects cert; alerts on expiry <14 days |
| dns     | `example.com A` or `MX` etc | passes if record resolves |
| ping    | hostname/IP                 | ICMP, needs raw sockets (skip in dev) |
| cert    | `example.com:443`           | pure certificate expiry probe |

## Config

Per check: `interval_seconds` (min 30), `timeout_ms` (default 5000),
`expected_status` (default 200), `regions` (deferred, single region until Phase 8+),
`is_enabled`.

## Worker

`backend/app/monitoring/uptime_worker.py`, launched as a separate process
(`uv run python -m app.monitoring.uptime_worker`). It:

1. Reads `uptime_checks WHERE is_enabled`.
2. For each check due, spawns an async task using `httpx.AsyncClient` (http/https),
   `dnspython` (dns), or an ICMP library (ping).
3. Writes an `uptime_results` row.
4. Opens/closes `incidents` on consecutive failures (default: 2 failures to open,
   2 successes to close — configurable per check).
5. `NOTIFY uptime_new` for the alert worker.

Concurrent checks: bounded by `asyncio.Semaphore(50)` by default.

## HTTPS cert expiry

For every https/cert check, capture `cert_expires_at` from the peer cert. A
background task fires an alert 14 / 7 / 1 days before expiry (deduped).

## API

```
GET    /api/v1/projects/{project}/uptime/checks
POST   /api/v1/projects/{project}/uptime/checks
PATCH  /api/v1/projects/{project}/uptime/checks/{id}
DELETE /api/v1/projects/{project}/uptime/checks/{id}
GET    /api/v1/projects/{project}/uptime/checks/{id}/history?range=24h|7d|30d
GET    /api/v1/projects/{project}/uptime/incidents
```

## Views

- Checks list with uptime% (last 24h/7d/30d) + latency sparkline.
- Check detail: bar chart of results, incident timeline.
- Cert expiry banner on the project dashboard when any cert is <14 days out.

## Files this spec adds

```
backend/app/api/v1/uptime.py
backend/app/services/uptime.py
backend/app/monitoring/uptime_worker.py
frontend/src/app/projects/[slug]/uptime/page.tsx
frontend/src/app/projects/[slug]/uptime/[id]/page.tsx
```
