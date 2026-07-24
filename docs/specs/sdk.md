# SDKs

The differentiator. Three SDKs at launch: `@watchtower/browser`, `@watchtower/node`,
`watchtower-sdk` (Python). All published from this repo.

## Locations

```
sdks/
├── watchtower-js/            # monorepo, uses tsup
│   ├── packages/browser
│   ├── packages/node
│   └── packages/core         # shared envelope + transport
└── watchtower-python/        # uv-managed
    └── watchtower_sdk/
```

`sdks/` is a new top-level dir — added when Phase 2 starts.

## Shared surface

```ts
init({
  dsn: string,                 // https://ingest.watchtower.example/wt_pub_xxx
  environment?: string,
  release?: string,
  sampleRate?: number,         // errors, 0..1, default 1
  tracesSampleRate?: number,   // transactions, 0..1, default 0.1
  beforeSend?: (event) => event | null,
  integrations?: Integration[],
});

captureException(err, hint?);
captureMessage(msg, level?);
addBreadcrumb({ category, message, data });
setUser({ id, email, username });
setTag(k, v);
setContext(name, obj);
startSpan(op, description, cb);
startTransaction(name, op);
```

## Browser SDK

Auto-integrations enabled by default:

- Global `error` and `unhandledrejection` handlers.
- Fetch and XHR wrapping — errors + `http.client` spans, propagates
  `watchtower-trace` header.
- Console breadcrumbs (`warn`/`error`).
- Navigation breadcrumbs.
- Page load transaction from `PerformanceObserver`.
- Route change transactions (Next.js + generic history listener).
- Core Web Vitals via optional `web-vitals` peer dep.

Bundle target: `<15KB gzipped` for the browser package without web-vitals.

## Node SDK

Auto-integrations:

- `uncaughtException` and `unhandledRejection`.
- HTTP client wrap (`http`/`https`, `undici`, `fetch` if global).
- Express, Koa, Fastify, and Next.js server middleware.
- Prisma / node-postgres query wrap for `db.query` spans.

## Python SDK

- Global `sys.excepthook` and `threading.excepthook`.
- ASGI middleware (`WatchtowerASGIMiddleware`) — first-class FastAPI/Starlette.
- WSGI middleware for Flask/Django.
- SQLAlchemy `before_cursor_execute` / `after_cursor_execute` for spans.
- Celery/RQ hooks for background job transactions.
- `logging` handler that ships logs to the logs endpoint.

## Transport

- Batches events client-side (max 30 per batch or every 5s, whichever first).
- Uses `fetch` (browser) / `undici` (node) / `httpx` (python).
- Retries with exponential backoff on 5xx; drops on 4xx (except 429 which
  respects `Retry-After`).
- Offline: browser SDK stashes up to 100 events in `sessionStorage`, flushes on
  next `online` event.

## Source maps

Browser SDK ships a CLI:

```
npx watchtower sourcemaps upload \
  --project my-proj --release 1.4.2 dist/
```

Uploads `.map` files to `POST /api/v1/projects/{project}/releases/{release}/files`.

## Files this spec adds

```
sdks/watchtower-js/                # separate PR from backend work
sdks/watchtower-python/
```

Backend endpoints these SDKs need (in `organizations-auth.md` / `ingest.md`):

- Ingest endpoints (already covered).
- `POST /api/v1/projects/{project}/releases`
- `POST /api/v1/projects/{project}/releases/{release}/files`  (multipart)
- `POST /api/v1/projects/{project}/releases/{release}/deploy`
