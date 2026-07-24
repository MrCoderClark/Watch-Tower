# Infrastructure monitoring

Agent-reported host metrics. Container/K8s deferred.

## Agent

Lightweight Python agent (`scripts/agent/`) — a single-file CLI installed via
`pip install watchtower-agent`. Reads config from `~/.watchtower/agent.toml`:

```toml
dsn = "https://ingest.watchtower.example/wt_sec_xxx"
hostname = "web-1"          # optional, defaults to gethostname()
interval_seconds = 60
```

Metrics gathered via `psutil`:

- `cpu_pct` — 1-min average across cores.
- `mem_used_bytes`, `mem_total_bytes`.
- `disk_used_bytes`, `disk_total_bytes` — root filesystem only, revisit for
  multi-mount later.
- `net_rx_bytes`, `net_tx_bytes` — delta since last sample.
- `process_count` — total.
- Optional: `services` list — array of `{name, running, pid}` for a configured
  set of names (e.g. `services = ["postgres", "nginx"]`).

Sent as a batch to `POST /api/v1/ingest/metrics` every `interval_seconds`.

## Storage

Two tables: `metrics_1m` (raw at agent interval) and `metrics_1h` (nightly rollup).
Retention: `metrics_1m` truncated after 14 days, `metrics_1h` after 365.

Rollup: a `pg_cron`-free nightly task inside the app process
(`app/monitoring/rollup.py`) using `date_trunc('hour', ts)` + `avg(...)`.

## Heartbeat / offline detection

`hosts.last_heartbeat_at` updated on every incoming batch. A host with no
heartbeat for `3 * interval_seconds` is flagged offline and fires an alert
(see `alerting.md`, `host_offline` rule kind).

## API

```
GET    /api/v1/projects/{project}/hosts
GET    /api/v1/projects/{project}/hosts/{id}
GET    /api/v1/projects/{project}/hosts/{id}/metrics?metric=cpu_pct&range=1h|24h|7d
DELETE /api/v1/projects/{project}/hosts/{id}
```

## Views

- Hosts list: hostname, last seen, CPU, memory, disk sparklines.
- Host detail: line charts (CPU, memory, disk, network), process count, services.

## Deferred (call out in UI, don't build)

- Container metrics (Docker stats / cAdvisor).
- Kubernetes pod/node metrics.
- Custom application metrics (StatsD-style). These belong in a `metrics.md` spec
  when we're ready.

## Files this spec adds

```
backend/app/api/v1/hosts.py
backend/app/services/hosts.py
backend/app/monitoring/rollup.py
scripts/agent/watchtower_agent/*.py
frontend/src/app/projects/[slug]/hosts/page.tsx
frontend/src/app/projects/[slug]/hosts/[id]/page.tsx
```
