# Architecture

## Shape

```
┌──────────────┐    events/logs      ┌──────────────────────┐
│ Customer app │ ──────────────────▶ │ Ingest API (FastAPI) │
│  + SDK       │  project key auth   │  /api/v1/ingest/*    │
└──────────────┘                     └──────────┬───────────┘
                                                │
                                    redact → fingerprint → persist
                                                │
                                                ▼
                                     ┌────────────────────┐
                    ┌──────────────▶ │  Neon Postgres     │
                    │                │  (jsonb + tsvector)│
                    │                └────────┬───────────┘
                    │                         │
              ┌─────┴────────┐                │
              │ Alert worker │◀──── LISTEN/NOTIFY on new events
              └─────┬────────┘
                    │ email / slack / discord / teams / webhook
                    ▼
                (channels)

┌────────────────────┐  JWT   ┌──────────────────────┐
│ Next.js dashboard  │ ─────▶ │ App API (FastAPI)    │
│  (App Router)      │        │  /api/v1/*           │
└────────────────────┘        └──────────────────────┘
```

Single FastAPI app for now, two conceptual surfaces:

- **Ingest API** — high volume, project-key auth, write-only, no user context.
- **App API** — dashboard reads/writes, user JWT auth, low volume.

They share the DB and models. Split into two services later only if load demands it
(`ponytail: single process, split if p95 write latency ≥ 200ms sustained`).

## Why Postgres for everything (for now)

- `jsonb` handles arbitrary event payloads without schema-per-feature.
- `tsvector` + GIN gives real full-text log search up to ~100M rows.
- `LISTEN/NOTIFY` is a free pub/sub for the alert worker.
- Neon branches give us cheap staging DBs.

We'll revisit if any of these bite: (a) sustained write >2k ev/s per project,
(b) log corpus >200GB, (c) time-series metric cardinality >100k series.

## Async everything

SQLAlchemy 2.0 async + asyncpg. No sync session anywhere in `app/`. Alembic uses
the async engine via `run_sync` in `env.py`.

## Auth model

- **Users** authenticate with JWT (short-lived access + rotating refresh).
- **SDKs / agents** authenticate with a per-project API key (`wt_pub_...` for
  browser use, `wt_sec_...` for server use). Public keys are rate-limited and
  scoped to ingest only. See `organizations-auth.md`.

## Directory expectations

Backend follows the existing package layout. Every feature spec below lists the
files it adds under those directories — no new top-level packages without a spec
update.

## Observability of Watchtower itself

Watchtower's own errors go to loguru → stderr in dev; in prod they go to a separate
Watchtower project (dogfood). Configured in `app/core/logging.py`.
