# Alerting

Fans out incidents to humans. Channels are org-scoped; rules are project-scoped.

## Rule kinds

| kind | condition example |
|---|---|
| `error_new_issue` | any new issue in project |
| `error_frequency` | `event_count > 100 in 5m` on a filter |
| `error_users` | `user_count > 25 in 5m` on a filter |
| `error_regression` | any resolved issue regressed |
| `perf_p95` | transaction `X` p95 > `1500ms` for 3 consecutive 5m windows |
| `perf_apdex` | project apdex < 0.7 in 15m |
| `uptime_down` | any incident opened on check `X` |
| `uptime_cert_expiring` | cert < 14/7/1 days |
| `host_offline` | host missed 3 heartbeats |
| `log_pattern` | count of logs matching filter > threshold in window |

`condition` and `threshold` live in a jsonb column so we can add kinds without
migrations.

## Channels

Org-scoped, reusable across projects:

- `email` — SMTP config in env; per-recipient in channel config.
- `slack` — incoming webhook URL.
- `discord` — webhook URL.
- `teams` — Adaptive Card via webhook.
- `webhook` — arbitrary URL with HMAC-signed body (`X-Watchtower-Signature: sha256=...`).

Config is stored jsonb; secret fields encrypted at rest with a key from env
(`WATCHTOWER_SECRET_KEY`). Rotation supported via key id in the jsonb.

## Escalation policies

Ordered `steps`, each: `{after_minutes, channel_ids, users?}`. Step 0 fires
immediately. If nobody acknowledges within `after_minutes`, step 1 fires. Etc.

Acknowledge = clicking a link from a channel message (signed URL) or hitting
`POST /api/v1/alerts/{id}/ack`.

## Quiet hours

Per-rule and per-user: `{ timezone, weekdays: [...], from: "22:00", to: "07:00" }`.
Fires suppressed inside quiet hours are queued; they fire when the window ends
UNLESS the incident resolved in the meantime.

## Worker

`backend/app/monitoring/alert_worker.py`:

```
LISTEN events_new, uptime_new, host_offline
  → evaluate rules for the affected project
  → dedupe (rule_id, fingerprint) within cooldown window
  → dispatch to channels (async httpx / smtplib)
  → record alert_event row
```

Rate limit: no more than 1 alert per rule per 5 min unless the rule opts into
`retrigger: true`.

## API

```
GET    /api/v1/orgs/{org}/channels
POST   /api/v1/orgs/{org}/channels
DELETE /api/v1/orgs/{org}/channels/{id}
POST   /api/v1/orgs/{org}/channels/{id}/test    # send a test message

GET    /api/v1/projects/{project}/rules
POST   /api/v1/projects/{project}/rules
PATCH  /api/v1/projects/{project}/rules/{id}
DELETE /api/v1/projects/{project}/rules/{id}

GET    /api/v1/orgs/{org}/policies
POST   /api/v1/orgs/{org}/policies
POST   /api/v1/alerts/{id}/ack
```

## Files this spec adds

```
backend/app/api/v1/alerting.py
backend/app/services/alerts.py
backend/app/services/channels/{email,slack,discord,teams,webhook}.py
backend/app/monitoring/alert_worker.py
frontend/src/app/orgs/[org]/channels/*
frontend/src/app/projects/[slug]/alerts/*
```
