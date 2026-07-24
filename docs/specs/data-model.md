# Data model

Postgres schema. All tables have `id uuid pk default gen_random_uuid()`,
`created_at timestamptz default now()`, and (where sensible) `updated_at timestamptz`.
Timestamps are always UTC.

## Tenancy

```
organizations
  slug (unique), name, plan

teams
  organization_id → organizations, name, slug

users
  email (unique citext), password_hash, name, avatar_url, is_active

memberships
  organization_id, user_id, role  -- owner|admin|member|viewer
  (unique on org+user)

team_memberships
  team_id, user_id, role

projects
  organization_id, team_id (nullable), slug, name, platform  -- 'javascript'|'python'|...
  (unique on org+slug)

project_keys
  project_id, kind ('public'|'secret'), key (indexed, unique),
  label, last_used_at, revoked_at
```

All observability rows carry `project_id`; every query filters by it. Row-level
isolation is enforced in service functions (no shared queries across projects).

## Errors / issues

```
events
  project_id, event_id (uuid, unique per project),
  received_at, occurred_at,
  environment, release,
  platform, sdk_name, sdk_version,
  level ('debug'|'info'|'warning'|'error'|'fatal'),
  message, exception jsonb, stacktrace jsonb,
  request jsonb, user_ jsonb, tags jsonb, contexts jsonb,
  breadcrumbs jsonb, attachments jsonb,
  browser_name, browser_version, os_name, os_version,
  fingerprint text,           -- hashed grouping key
  issue_id → issues

issues
  project_id, fingerprint (unique per project),
  title, culprit, level,
  status ('unresolved'|'resolved'|'ignored'|'regressed'),
  assignee_id → users nullable,
  first_seen_at, last_seen_at, event_count, user_count,
  resolved_in_release nullable

issue_comments
  issue_id, user_id, body, created_at
```

Indexes: `events(project_id, occurred_at desc)`, `events(issue_id, occurred_at desc)`,
`issues(project_id, last_seen_at desc)`, `issues(project_id, status, last_seen_at desc)`.

## Performance

```
transactions
  project_id, trace_id, transaction_id (unique per trace),
  name, op, status, environment, release,
  started_at, ended_at, duration_ms,
  tags jsonb, measurements jsonb

spans
  transaction_id → transactions,
  span_id, parent_span_id, op, description,
  started_at, ended_at, duration_ms, data jsonb
```

Indexes: `transactions(project_id, started_at desc)`,
`transactions(project_id, name, started_at desc)`, `spans(transaction_id)`.

## Uptime

```
uptime_checks
  project_id, name, kind ('http'|'https'|'dns'|'ping'|'cert'),
  target, interval_seconds, timeout_ms, expected_status,
  regions text[], is_enabled

uptime_results
  check_id → uptime_checks,
  checked_at, region, ok bool, status_code int nullable,
  latency_ms int, error text nullable, cert_expires_at nullable

incidents
  check_id → uptime_checks,
  started_at, resolved_at nullable, summary
```

Index: `uptime_results(check_id, checked_at desc)`.

## Logs

```
logs
  project_id, received_at, occurred_at,
  level, service, message, attributes jsonb,
  trace_id nullable, span_id nullable,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(message,''))) stored
```

Index: `logs(project_id, occurred_at desc)`, GIN on `search_vector`.

## Infrastructure metrics

```
hosts
  project_id, hostname (unique per project), agent_version,
  os, os_version, last_heartbeat_at

metrics_1m
  host_id → hosts, ts (timestamptz),
  cpu_pct, mem_used_bytes, mem_total_bytes,
  disk_used_bytes, disk_total_bytes,
  net_rx_bytes, net_tx_bytes,
  process_count

metrics_1h
  host_id, ts, <same rollups but averaged>
```

Rollups written by a nightly job. Old `metrics_1m` truncated after 14 days.

## Alerts

```
alert_rules
  project_id, name, kind, condition jsonb, threshold jsonb,
  channels text[], escalation_policy_id nullable,
  quiet_hours jsonb, is_enabled

alert_events
  rule_id → alert_rules, fired_at, resolved_at nullable,
  context jsonb

alert_channels
  organization_id, kind ('email'|'slack'|'discord'|'teams'|'webhook'),
  name, config jsonb (secrets encrypted at rest)

escalation_policies
  organization_id, name, steps jsonb
```

## Releases (used everywhere)

```
releases
  project_id, version (unique per project),
  ref (git sha), url, deployed_at, created_at
```

## Deferred fields

Anything marked "future" in the top-level scope isn't in this schema. Add via
Alembic when its spec lands.
