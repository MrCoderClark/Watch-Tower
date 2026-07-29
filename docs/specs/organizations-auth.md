# Organizations, teams, projects, auth

Foundational tenancy layer everything else assumes.

## Sign up / sign in

- `POST /api/v1/auth/signup` — `email`, `password`, `name`. Creates a user + a
  personal org (`user's name Personal`) + owner membership.
- `POST /api/v1/auth/login` — returns access JWT (15m) + refresh token (30d,
  HTTP-only cookie).
- `POST /api/v1/auth/refresh` — rotates refresh, returns new access.
- `POST /api/v1/auth/logout` — revokes refresh.
- `POST /api/v1/auth/forgot` / `POST /api/v1/auth/reset` — email token flow.

Passwords hashed with `bcrypt` directly, cost 12. `passlib` was in the original
plan but breaks against `bcrypt` 4.x at import — dropped for a ~4-line direct call.
JWT signed with HS256 using `WATCHTOWER_SECRET_KEY`.

Frontend uses an in-house `AuthProvider` (React context) that talks directly to
these endpoints — access token held in memory, refresh token in the http-only
cookie the backend sets. Auth.js is installed but unused; it comes back when we
add OAuth providers.

## Roles

Per org membership:

| role   | can |
|--------|-----|
| owner  | everything, billing, delete org |
| admin  | everything except billing/delete |
| member | create/edit projects on teams they belong to |
| viewer | read-only |

Enforced via a single `require_role(role: Role)` FastAPI dependency and mirrored
in the frontend router.

## Teams

Optional layer between org and project. A project may belong to zero or one team.
Team members inherit access to team projects.

## Projects

Per-project settings:

- `slug`, `name`, `platform` (drives SDK setup instructions).
- Environment list (`production`, `staging`, `development`, +custom).
- Rate limit override (secret-key writes only).
- Log retention days.
- Data-scrubbing extra fields.

## API keys

- Two kinds: `public` (browser SDKs, ingest-only, low rate limit) and `secret`
  (server SDKs / agents, full ingest, higher rate limit).
- Keys are shown once at creation, hashed at rest (`sha256`), prefix stored for
  display.
- Revoking sets `revoked_at`; ingest endpoints reject revoked keys.

## API

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot
POST   /api/v1/auth/reset

GET    /api/v1/orgs
POST   /api/v1/orgs
GET    /api/v1/orgs/{slug}
PATCH  /api/v1/orgs/{slug}
DELETE /api/v1/orgs/{slug}

GET    /api/v1/orgs/{slug}/members
POST   /api/v1/orgs/{slug}/members         # invite
DELETE /api/v1/orgs/{slug}/members/{id}
PATCH  /api/v1/orgs/{slug}/members/{id}    # change role

GET    /api/v1/orgs/{slug}/teams
POST   /api/v1/orgs/{slug}/teams
PATCH  /api/v1/orgs/{slug}/teams/{id}
DELETE /api/v1/orgs/{slug}/teams/{id}

GET    /api/v1/orgs/{slug}/projects
POST   /api/v1/orgs/{slug}/projects
GET    /api/v1/projects/{slug}
PATCH  /api/v1/projects/{slug}
DELETE /api/v1/projects/{slug}

GET    /api/v1/projects/{slug}/keys
POST   /api/v1/projects/{slug}/keys
DELETE /api/v1/projects/{slug}/keys/{id}
```

## Frontend routes

```
/login, /signup, /forgot
/orgs/new
/orgs/{slug}/settings
/orgs/{slug}/members
/orgs/{slug}/teams
/projects/new
/projects/{slug}/settings
/projects/{slug}/settings/keys
```

## Files this spec adds

```
backend/app/api/v1/auth.py
backend/app/api/v1/orgs.py
backend/app/api/v1/teams.py
backend/app/api/v1/projects.py
backend/app/api/v1/keys.py
backend/app/services/auth.py
backend/app/services/orgs.py
backend/app/services/projects.py
backend/app/core/security.py      # jwt, hashing, deps
frontend/src/app/(auth)/*
frontend/src/app/orgs/*
frontend/src/app/projects/*
frontend/src/lib/api-client.ts
```
