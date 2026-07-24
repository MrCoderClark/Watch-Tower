# Error tracking

The Sentry-style core. Assumes `ingest.md` is built.

## User-facing features

- Issue list per project with filters: environment, release, level, assignee, status,
  free-text on title.
- Issue detail:
  - Title + culprit + level + status.
  - Stack trace with expandable frames; frames show ±5 lines of source context
    if the release has a source map / source bundle uploaded.
  - Latest event + prev/next event navigation.
  - Tags, custom context, breadcrumbs, request, user, browser, OS.
  - Attachments (image previews for pngs/jpegs; raw download otherwise).
  - Frequency chart (24h / 7d / 30d) built from a Postgres `date_trunc` query.
  - First seen / last seen; unique users affected.
  - Comment thread.
- Actions: **resolve**, **resolve in next release**, **ignore** (forever /
  until X events / until Y users), **unresolve**, **regress** (automatic when an
  event lands on a resolved issue), **assign to teammate**, **comment**, **delete**.
- Bulk actions from the list view.

## Grouping

Two events share an issue iff they share a fingerprint (`ingest.md`). The first
event to land on a new fingerprint creates the issue and stamps `first_seen_at`.
Every event updates `last_seen_at`, increments `event_count`, and — if it carries
a `user.id` we haven't seen for this issue — increments `user_count`.

`user_count` is a `hyperloglog`-free count for now: a small `issue_users(issue_id,
user_hash)` unique table with `ON CONFLICT DO NOTHING`. Revisit if that table
outgrows 100M rows (`ponytail: naive count-distinct, switch to HLL when it hurts`).

## Regression detection

If a resolved issue receives a new event:

1. Compare event's `release` to `resolved_in_release`.
2. If different (or `resolved_in_release` is null), set status → `regressed`,
   fire an alert (see `alerting.md`), record who resolved it.

## API surface

```
GET    /api/v1/projects/{project}/issues
GET    /api/v1/projects/{project}/issues/{issue}
GET    /api/v1/projects/{project}/issues/{issue}/events
GET    /api/v1/projects/{project}/issues/{issue}/events/{event}
GET    /api/v1/projects/{project}/issues/{issue}/frequency?range=24h|7d|30d
POST   /api/v1/projects/{project}/issues/{issue}/comments
PATCH  /api/v1/projects/{project}/issues/{issue}   # status, assignee, delete
POST   /api/v1/projects/{project}/issues/bulk      # bulk action
```

## Source context

Uploading a release (`sdk.md`) may attach a tarball of source files OR source maps.
On stack trace render, the API resolves each frame via the release's file map and
returns ±5 lines. If no release upload, we render whatever the SDK sent (frame
`context_line` + `pre_context` + `post_context`).

Source-file storage: same bucket as attachments, prefix `releases/`.

## Frontend routes

```
/projects/{slug}/issues                 # list
/projects/{slug}/issues/{id}            # detail
/projects/{slug}/issues/{id}/events/{n} # specific event
```

## Files this spec adds

```
backend/app/api/v1/issues.py
backend/app/services/issues.py
backend/app/services/grouping.py         # deep grouping helpers, if any
frontend/src/app/projects/[slug]/issues/page.tsx
frontend/src/app/projects/[slug]/issues/[id]/page.tsx
frontend/src/components/issues/*
```
