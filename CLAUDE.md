# Watchtower — AI Collaborator Guide

Application observability platform: error tracking, performance, uptime, infra, logs, alerting.
This file is loaded by AI tools working in the repo. Keep it short and honest.

## Repo layout

```
D:\Code\Watchtower
├── frontend\   # Next.js (App Router) + TS + Tailwind + shadcn/ui
├── backend\    # FastAPI + SQLAlchemy 2.0 async + asyncpg + Alembic
├── docs\       # PLAN.md and specs/*.md — read these before building
├── docker\     # compose files, Dockerfiles (later)
└── scripts\    # one-off ops scripts
```

Frontend has its own `CLAUDE.md` and `AGENTS.md`. Read them when working in `frontend/`.

Visual language is locked by `docs/specs/design-system.md` — read it before touching
UI. Reference mockup: `docs/Designs/Design-1.png`.

## Stack (locked)

**Backend:** Python 3.13+, FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic, Pydantic v2,
pydantic-settings, uv. Auth via JWT (python-jose) + passlib. Logs via loguru.
**Frontend:** Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Auth.js,
TanStack Query, React Hook Form, Zod.
**DB:** Neon Postgres (connection string in `backend/.env.local`).

Do not swap parts of the stack without an ADR in `docs/adr/`.

## Rules

- Async DB access only. No sync `Session`.
- All secrets from env. Never hardcode.
- Strict TypeScript on the frontend. Fully typed Python (mypy) on the backend.
- Prefer editing existing files over creating new ones.
- No placeholder/TODO code committed. If it's not built, leave it out and note it in the spec.
- One migration per schema change. Alembic autogenerate, then review the diff by hand.
- Ingest endpoints must accept a project API key, not a user JWT.
- Redact PII/secrets at ingest (`app/monitoring/redact.py`) before persisting payloads.

## Where things live

| Concern | Path |
|---|---|
| API routes | `backend/app/api/` (one router per resource) |
| ORM models | `backend/app/models/` |
| Pydantic schemas | `backend/app/schemas/` |
| Business logic | `backend/app/services/` |
| Ingest pipeline | `backend/app/monitoring/` |
| Config | `backend/app/core/config.py` (pydantic-settings) |
| DB session | `backend/app/db/session.py` |
| Migrations | `backend/migrations/versions/` |
| Frontend pages | `frontend/src/app/` |
| Frontend components | `frontend/src/components/` |

## Commands

```bash
# backend
cd backend && uv run uvicorn app.main:app --reload
cd backend && uv run alembic revision --autogenerate -m "msg"
cd backend && uv run alembic upgrade head
cd backend && uv run pytest

# frontend
cd frontend && npm run dev
cd frontend && npm run build
```

## Ponytail defaults

Reach for stdlib and Postgres features before dependencies. Postgres does more than
people remember: `jsonb`, `tsvector` full-text, `pg_partman`-free time-range tables,
`ON CONFLICT`, `LISTEN/NOTIFY`. Don't add Elasticsearch/ClickHouse/Redis until we've
measured Postgres failing.
