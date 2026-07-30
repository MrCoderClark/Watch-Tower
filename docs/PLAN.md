# Watchtower — Build Plan

Phased plan. Each phase ends in something demoable and shippable. Don't jump ahead;
later phases assume earlier foundations are real.

Reading order: this file → `specs/architecture.md` → `specs/data-model.md` → the spec
for the phase you're on.

**Scope note (2026-07-30):** target is Sentry-parity for real production usage.
Backend SDKs scoped to **Python + Node** only (Express + Next.js server). Other
runtimes (Go, Java, .NET, Ruby, PHP, Rust) explicitly out of scope. Mobile scope
still TBD — see phase 15.

---

## Phase 0 — Foundations (1 week)  ·  **Done** (merged into `main`, 2026-07-27)

Goal: an app skeleton with auth, orgs, projects, and a health endpoint.

- Backend: `core/config.py`, `db/session.py`, `db/base.py`, `main.py` mounting `/api/v1`.
- Alembic wired to async engine; first migration is the `organizations`, `teams`,
  `users`, `memberships`, `projects`, `project_keys` tables.
- Auth: email+password signup/login, JWT access + refresh, `Depends(current_user)`.
- Frontend: in-house AuthProvider hitting the backend (Auth.js deferred until we
  need OAuth); `/login`, `/signup`, `/dashboard` shell with sidebar + org switcher.
- `GET /api/v1/health` returns `{ok: true, db: true}`.

Exit: a user can sign up, create an org, create a project, and see an empty dashboard.

Specs: `architecture.md`, `data-model.md`, `organizations-auth.md`.

---

## Phase 1 — Error tracking (2 weeks)  ·  **Done** (PR #1 merged into `main`, 2026-07-29)

Goal: the Sentry-style core. Ingest → group → view → resolve.

- `POST /api/v1/ingest/events` (project-key auth) accepts a normalized event envelope.
- Fingerprinting + grouping into `issues`. First seen / last seen / event count.
- Issue list, issue detail (stack trace w/ source context, tags, breadcrumbs,
  request payload, user, release, environment).
- Resolve / ignore / regress / assign.
- Charts: 24h / 7d / 30d event frequency (Postgres `date_trunc` — no external TSDB yet).

Exit: a demo script POSTs a fake error; it shows up grouped in the UI within 2s.

Specs: `ingest.md`, `error-tracking.md`.

---

## Phase 2 — SDK — browser + Python (1 week)  ·  **Done** (PR #2 merged 2026-07-29)

Goal: real apps can send events without hand-rolling JSON.

- `@watchtower/browser`: init, captureException, captureMessage, global error +
  unhandledrejection handlers, stack parser. Fire-and-forget transport.
- `watchtower-sdk` (Python): init, capture_exception, capture_message,
  WatchtowerMiddleware (ASGI), atexit drain.
- Shared event envelope in `specs/sdk.md`.
- npm workspaces monorepo setup so the frontend can dogfood the local SDK.

Exit: adding 3 lines to a real Next.js app and a real FastAPI app produces events
in the dashboard.  ✅ hit.

Source-map upload CLI and `@watchtower/node` moved to Phases 8 and 10.

Spec: `sdk.md`.

---

## Phase 3 — Performance monitoring — server-side (2 weeks)  ·  **Done** (PR #3 merged 2026-07-29)

Goal: transactions and spans; slow-endpoint views.

- Transaction envelope (trace_id, span tree, timings).
- FastAPI middleware wraps each request in a transaction.
- SQLAlchemy event hook emits `db.query` spans.
- Aggregation by transaction name with p50/p95/p99 via Postgres
  `percentile_cont`; drill-in shows the span tree.

Exit: a `/checkout`-style route lights up as slow; drilling in shows the SQL
span.  ✅ hit.

Client-side perf (Web Vitals, route change, fetch/XHR wrap) moved to Phase 9.

Spec: `performance.md`.

---

## Phase 4 — Uptime + first alerting (1 week)  ·  **Done** (PR #4 merged 2026-07-29)

Goal: black-box monitoring and the first alert channel.

- HTTP uptime checks, 2 consecutive failures opens an "incident" (state on the
  check itself; no separate incidents table yet).
- Async worker in the API lifespan; separate process supported via `python -m`.
- Slack webhook on the down→up edge (both flips notified).
- CRUD UI for checks (add, edit, delete).

Exit: kill a demo service; a Slack alert fires within a minute.  ✅ hit.

HTTPS cert / DNS / ping / cron / more channels / escalation / quiet hours / ack
all moved to Phase 12.

Specs: `uptime.md`, `alerting.md`.

---

## Phase 5 — Logs (1 week)  ·  **Done** (PR #5 merged 2026-07-29)

Goal: correlated structured logs.

- `POST /api/v1/ingest/logs` batch endpoint (redacted, deduped on event_id).
- Postgres `to_tsvector('english', message)` + GIN index for full-text search.
- Filters: q (FTS), level, service, trace_id, from/to, cursor pagination.
- Python SDK: `WatchtowerLogHandler(logging.Handler)` batches into ingest;
  auto-tags trace_id from the current transaction.
- Dogfooded on the backend's root logger.

Exit: structured logs with FTS + filter by level/service/trace_id.  ✅ hit.

Trace_id filter in the UI + issue→related-logs link deferred (Phase 11 with
distributed tracing).

Spec: `logging.md`.

---

## Phase 6 — Infrastructure metrics (1 week)  ·  **Done** (PR #6 merged 2026-07-29)

Goal: agent-reported host metrics.

- `hosts` + `metrics_1m` tables. Host self-registers on first metrics batch.
- `POST /api/v1/ingest/metrics` (SECRET key required — public keys rejected).
- Single-file Python agent (`scripts/agent/watchtower_agent.py`), psutil-based,
  TOML config, packaged as `watchtower-agent`.
- Hosts list with CPU/mem/disk % + 1h CPU sparkline + online dot.

Exit: agent running on a real machine → shows up in the UI with live metrics.
  ✅ hit.

Container/K8s metrics, hourly rollup + retention, host detail page all deferred.

Spec: `infrastructure.md`.

---

## Phase 7 — Dashboard polish + nav cleanup (1 week)  ·  **In progress**

Goal: the landing screen a customer actually likes; every link works.

- Overview page: cross-feature KPI row (issues + uptime% + hosts + slowest tx p95).
- Alerts stub page (currently-down uptime checks + config pointers).
- Sidebar: removed dead Releases/Traces entries.
- Header: Bell / Settings icons now Link to real routes.

Exit: nothing in the nav 404s; overview reflects real state across all phases.

Deferred: live metrics via SSE, deploy timeline, release-health widget (needs
Phase 8 first).

Spec: `dashboard.md`.

---

# --- Sentry-parity roadmap (2026-07-30 revision) ---

## Phase 8 — Releases + Source Maps (2 weeks)

Goal: associate every event with a release, decode minified stack traces.

- `releases` + `release_files` tables (project-scoped, unique by version).
- `POST /api/v1/projects/{p}/releases` — create.
- `POST /api/v1/projects/{p}/releases/{v}/files` — multipart upload for
  source maps (`.js.map`) and native symbol files (deferred: mobile).
- `POST /api/v1/projects/{p}/releases/{v}/deploy` — mark deploy start/end.
- Symbolication on ingest: when an event carries `release` and a frame has a
  `filename` matching an uploaded `.js.map`, rewrite the frame in-place with
  the original source position.
- `watchtower sourcemaps upload` CLI in the JS SDK — walks `dist/`, POSTs each
  `.map` file, deletes them (opt-in).
- Release health: crash-free session % per release (needs SDK to emit
  session-start / session-end events; small addition).
- Dashboard "Recent deploys" widget (unblocked).

Spec: needs new `releases.md`.

---

## Phase 9 — Client-side performance (1 week)

Goal: complete the Performance story from Phase 3 on the browser side.

- `@watchtower/browser` gains: page-load transaction from
  `PerformanceObserver` (navigation entries), route-change transactions for
  Next.js router, `fetch` + `XMLHttpRequest` wrap → `http.client` spans.
- Core Web Vitals (`lcp`, `fid`, `cls`, `ttfb`, `fcp`, `inp`) via optional
  `web-vitals` peer dep, sent as `measurements` on the page-load transaction.
- Frontend: Web Vitals view per route.

Spec extension: `specs/performance.md` (add client-side section).

---

## Phase 10 — @watchtower/node SDK (1 week)

Goal: Node backends can report errors + transactions.

- `@watchtower/node` in the JS monorepo alongside `browser`. Shared `core`
  package for envelope + transport.
- Auto-integrations: `uncaughtException`, `unhandledRejection`, HTTP client
  wrap (`http`/`https`/`undici`/global `fetch`), Express + Fastify + Koa
  middleware, Next.js server middleware, Prisma / `pg` query wrap for
  `db.query` spans.
- Same batched transport / atexit drain as the Python SDK.

Non-goals (scope-cut): Go, Java, .NET, Ruby, PHP, Rust.

Spec: needs new `specs/sdk-node.md`.

---

## Phase 11 — Distributed tracing (1 week)

Goal: single trace across browser → Node → Python.

- All three SDKs read/write `watchtower-trace: <trace_id>-<parent_span_id>-<sampled>`
  header on outbound HTTP; ingest-side accepts and connects spans across services.
- Trace viewer page: given a trace_id, show all transactions and spans across
  services in one flame graph.
- Logs UI: trace_id filter box + "View logs" button on issue detail
  (±30s same trace).

Spec extension: `specs/performance.md` (add tracing section).

---

## Phase 12 — Full alerting (1-2 weeks)

Goal: real production alerting.

- `alert_rules` + `alert_channels` + `alert_events` tables.
- Rule kinds: `error_new_issue`, `error_frequency`, `error_regression`,
  `perf_p95`, `perf_apdex`, `uptime_down` (already implicit), `host_offline`,
  `log_pattern`, `cron_missed`.
- Channels: Slack (✅), Discord, Teams (Adaptive Card), Email (SMTP),
  Generic Webhook (HMAC-signed), PagerDuty (Events API v2), Opsgenie.
- Escalation policies (ordered steps, `after_minutes`).
- Quiet hours (per rule + per user, timezone-aware).
- Ack flow: signed URL in the message + `POST /alerts/{id}/ack`.
- Alert history + rule editor UI.

Spec: `specs/alerting.md` (already exists; build to match).

---

## Phase 13 — Cron monitoring (3-4 days)

Goal: know when a scheduled job silently stops running.

- `crons` table: slug, schedule (cron expr), grace_period_s, project_id.
- `POST /api/v1/projects/{p}/crons/{slug}/check-in?status=ok|error` from the
  job itself; also `?status=start` to bracket long-running jobs.
- Worker computes next expected fire from the cron expr; a check-in missed
  by more than grace flips the cron to "missing" and fires an alert
  (via new `cron_missed` rule kind from Phase 12).
- UI: crons list + individual cron history.

Spec: needs `specs/cron.md`.

---

## Phase 14 — Session Replay (3-4 weeks)

Goal: play back what a user was doing when an error occurred.

- Browser SDK: `rrweb` peer dep records DOM mutations + input; buffered in a
  ring, flushed on `captureException` with `replay_id`.
- Backend: `replays` table (metadata) + object storage (S3-compatible) for the
  event stream. Retention per project.
- Player UI: rrweb player embedded in the issue detail page, seeks to the
  moment of the error.
- Privacy: block-list selectors (never record `password`, opt-in `text-content`),
  mask-by-default on inputs.

**Biggest single feature on this plan.** Prerequisite: object storage decision
(local disk in dev, S3 in prod).

Spec: needs `specs/session-replay.md`.

---

## Phase 15 — Mobile SDKs — **scope TBD**

Options (each is ~2-4 weeks):

- **iOS** (Swift, dSYM upload for symbolication)
- **Android** (Kotlin, ProGuard mapping upload)
- **React Native** (JS bridge to Phase 9 client-perf work)
- **Flutter** (Dart obfuscation map upload)

Unity / Xamarin explicitly out.

Owner decision needed before phase starts: which platforms actually matter for
first customers.

---

## Phase 16 — Profiling (2 weeks)

Goal: CPU profile tied to slow transactions.

- Python SDK: opt-in `py-spy`-based sampling profiler around long-running
  transactions. Sends a compact call-tree with each transaction envelope.
- Node SDK: same via `@datadog/pprof` or built-in `--prof`.
- Storage: `profiles` table linked by `transaction_id`.
- Flame graph UI on the transaction detail page.

Spec: needs `specs/profiling.md`.

---

## Phase 17 — AI assistance (1 week)

Goal: "Explain this error" and "Suggest a fix" on the issue detail page.

- Prompt: stack trace + surrounding source (from uploaded source maps or
  release file bundle) + recent breadcrumbs + related logs → Claude via
  Anthropic API.
- Result cached on the issue (per fingerprint) so re-opens don't re-bill.
- Rate-limited per project.
- Bring-your-own-key toggle (env var) so we don't cover LLM cost by default.

Spec: needs `specs/ai-assist.md`.

---

## Phase 18 — Issue management polish (1 week)

Goal: catch up on the issue-workflow UX Sentry has.

- Comments on issues (backend already had `Comment` mentioned; wire it up).
- Bulk actions (multi-select resolve/ignore/assign).
- Saved views per project.
- Better regression detection tuning.
- Slack thread → issue link when an alert fires with `alert_events`.

---

## Cross-cutting, always on

- Every ingest path is idempotent on `event_id`.
- Every persisted payload is redacted first.
- Every new endpoint has a happy-path pytest.
- Alembic diff reviewed by hand before commit.
- Every SDK change gets its offline check updated in the same commit.

## Explicitly out of scope until asked

- Multi-region storage
- Self-hosted install path (Docker Compose stays for dev only)
- SAML SSO / SCIM
- Kubernetes / container metrics
- Backend SDKs beyond Python + Node (Go, Java, .NET, Ruby, PHP, Rust)
- Unity / Xamarin mobile SDKs
- On-call scheduling beyond simple escalation policies

## Rough sequencing (2026-07-30)

Phases 8 → 9 → 10 → 11 → 12 → 13 unlock ~80% of Sentry's real-world value with
the current runtime scope.

Phases 14, 15, 16, 17 are big-bet features — each deserves a scope decision
before starting.

Phase 18 is polish; can slot in whenever between the above.
