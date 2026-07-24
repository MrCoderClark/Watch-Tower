# Dashboard

The landing screen after login. Fast, live, per-project.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar: org switcher, projects list, settings              │
├─────────────────────────────────────────────────────────────┤
│ Project overview                                            │
│                                                             │
│  [ Open incidents ] [ Active alerts ] [ Recent deploys ]    │
│                                                             │
│  Error trend (24h)          Perf trend p95 (24h)            │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │      chart      │        │      chart      │             │
│  └─────────────────┘        └─────────────────┘             │
│                                                             │
│  Release health                                             │
│  ┌───────────────────────────────────────────┐              │
│  │ 1.4.2 · 3h ago · 0.12% crash-free session │              │
│  │ 1.4.1 · 1d ago · 0.31% crash-free session │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│  Live metrics (SSE)                                         │
│  events/sec · transactions/sec · logs/sec                   │
└─────────────────────────────────────────────────────────────┘
```

## Data sources

- **Open incidents** — `incidents WHERE resolved_at IS NULL` and open regressions.
- **Active alerts** — `alert_events WHERE resolved_at IS NULL` in the last 24h.
- **Recent deploys** — top 5 `releases ORDER BY deployed_at DESC`.
- **Error trend** — one query, `date_trunc('hour', occurred_at)` last 24h.
- **Perf trend** — p95 of transactions by hour, last 24h. Postgres
  `percentile_cont` in a single query.
- **Release health** — `crash_free_sessions = 1 - (sessions_with_errors / sessions)`.
  Sessions come from browser SDK (`session.start`/`session.end` in the envelope).
- **Live metrics** — SSE stream `/api/v1/projects/{project}/live` emitting
  `{events_per_sec, transactions_per_sec, logs_per_sec}` every 2s. Backed by
  a small in-memory counter reset on tick; no persistence.

## Charts

No heavy chart lib. Use `recharts` (already in the shadcn ecosystem) — one small
`<TimeSeries data={...}/>` wrapper in `frontend/src/components/charts/`.

## Files this spec adds

```
backend/app/api/v1/dashboard.py
backend/app/api/v1/live.py             # SSE
backend/app/services/dashboard.py
frontend/src/app/projects/[slug]/page.tsx
frontend/src/components/dashboard/*
frontend/src/components/charts/time-series.tsx
```
