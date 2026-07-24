# Watchtower — Build Plan

Phased plan. Each phase ends in something demoable and shippable. Don't jump ahead;
later phases assume earlier foundations are real.

Reading order: this file → `specs/architecture.md` → `specs/data-model.md` → the spec
for the phase you're on.

---

## Phase 0 — Foundations (1 week)

Goal: an app skeleton with auth, orgs, projects, and a health endpoint.

- Backend: `core/config.py`, `db/session.py`, `db/base.py`, `main.py` mounting `/api/v1`.
- Alembic wired to async engine; first migration is the `organizations`, `teams`,
  `users`, `memberships`, `projects`, `project_keys` tables.
- Auth: email+password signup/login, JWT access + refresh, `Depends(current_user)`.
- Frontend: Auth.js credentials provider hitting the backend; `/login`, `/signup`,
  `/dashboard` shell with sidebar + org switcher.
- `GET /api/v1/health` returns `{ok: true, db: true}`.

Exit: a user can sign up, create an org, create a project, and see an empty dashboard.

Specs: `architecture.md`, `data-model.md`, `organizations-auth.md`.

---

## Phase 1 — Error tracking (2 weeks)

Goal: the Sentry-style core. Ingest → group → view → resolve.

- `POST /api/v1/ingest/events` (project-key auth) accepts a normalized event envelope.
- Fingerprinting + grouping into `issues`. First seen / last seen / event count.
- Issue list, issue detail (stack trace w/ source context, tags, breadcrumbs,
  request payload, user, release, environment).
- Resolve / ignore / regress / assign / comment.
- Charts: 24h / 7d / 30d event frequency (Postgres `date_trunc` — no external TSDB yet).

Exit: a demo script POSTs a fake error; it shows up grouped in the UI within 2s.

Specs: `ingest.md`, `error-tracking.md`.

---

## Phase 2 — SDK (1 week)

Goal: real apps can send events without hand-rolling JSON.

- JS/TS SDK: `@watchtower/browser` and `@watchtower/node`. `init({dsn, environment,
  release})`, global handlers, `captureException`, `captureMessage`, breadcrumbs,
  scope/tags, before-send hook, source-map upload CLI.
- Python SDK: `watchtower-sdk`, WSGI/ASGI middleware, `capture_exception`, integrations
  for FastAPI and Flask.
- Shared event envelope in `specs/sdk.md`.

Exit: adding 3 lines to a real Next.js app and a real FastAPI app produces events
in the dashboard.

Spec: `sdk.md`.

---

## Phase 3 — Performance monitoring (2 weeks)

Goal: transactions and spans; slow-endpoint views.

- Transaction envelope (trace_id, span tree, timings).
- Server: API endpoint latency, DB span durations, background job durations.
- Client: page load, Core Web Vitals via `web-vitals`.
- Views: slow transactions, endpoint p50/p95/p99, Web Vitals per route.

Exit: a `/checkout` route lights up as slow; drilling in shows the SQL span.

Spec: `performance.md`.

---

## Phase 4 — Uptime + alerts (1 week)

Goal: black-box monitoring and the first alert channels.

- Uptime: HTTP/HTTPS/DNS/ping checks, cert expiry, from one central worker.
- Alert rules per project: "error frequency > X in Y", "uptime check down", etc.
- Channels: email, Slack, Discord, Teams, generic webhook.
- Escalation policies + quiet hours.

Exit: kill a demo service; a Slack alert fires within a minute.

Specs: `uptime.md`, `alerting.md`.

---

## Phase 5 — Logs (1 week)

Goal: correlated structured logs.

- `POST /api/v1/ingest/logs` batch endpoint.
- Storage in Postgres with `tsvector` + GIN index for search (revisit if size hurts).
- Filter by level, service, trace_id; link from an error → surrounding logs.
- Retention policy per project.

Spec: `logging.md`.

---

## Phase 6 — Infrastructure metrics (1 week)

Goal: agent-reported host metrics.

- Lightweight agent binary (Python for now) reports CPU/memory/disk/network/processes.
- Time-series storage in Postgres (hypertable-free; 1m rollups + 1h rollups).
- Host list + host detail with sparklines.

Container/K8s metrics deferred (spec calls it out).

Spec: `infrastructure.md`.

---

## Phase 7 — Dashboard polish (1 week)

Goal: the landing screen a customer actually likes.

- Live metrics (server-sent events), open incidents, recent deploys, active alerts.
- Release health widget.
- Per-project overview.

Spec: `dashboard.md`.

---

## Cross-cutting, always on

- Every ingest path is idempotent on `event_id`.
- Every persisted payload is redacted first.
- Every new endpoint has a happy-path pytest.
- Alembic diff reviewed by hand before commit.

## Explicitly out of scope until asked

- Multi-region storage
- Self-hosted install path (Docker Compose stays for dev only)
- SAML SSO / SCIM (mentioned as "future")
- Kubernetes / container metrics (Phase 6 mentions, doesn't build)
- Mobile SDKs
- On-call scheduling beyond simple escalation policies
