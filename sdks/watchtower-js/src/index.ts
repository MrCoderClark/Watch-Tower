// Watchtower browser SDK — minimal capture surface.
// Envelope shape lives in backend/app/schemas/envelope.py; keep in sync.

type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface InitOptions {
  dsn: string;
  environment?: string;
  release?: string;
  beforeSend?: (event: WtEvent) => WtEvent | null;
}

interface Frame {
  function?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

interface Stacktrace {
  frames: Frame[];
}

interface ExceptionInfo {
  type: string;
  value?: string;
  stacktrace?: Stacktrace;
}

export interface WtEvent {
  event_id: string;
  timestamp: string;
  environment: string;
  release?: string;
  platform: 'javascript';
  sdk: { name: string; version: string };
  level: Level;
  message?: string;
  exception?: ExceptionInfo;
  tags?: Record<string, string>;
}

interface Config {
  url: string;
  key: string;
  environment: string;
  release?: string;
  beforeSend?: (e: WtEvent) => WtEvent | null;
}

const SDK = { name: 'watchtower.browser', version: '0.1.0' };
let cfg: Config | null = null;

function uuid(): string {
  const c: Crypto | undefined =
    typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ponytail: chrome/node stack format only. Firefox/Safari fall through as
// unnamed frames — good enough for fingerprinting, upgrade if UX suffers.
function parseStack(stack: string): Frame[] {
  const frames: Frame[] = [];
  for (const line of stack.split('\n')) {
    const m = line.match(/at (?:(.+?) \()?([^ )]+):(\d+):(\d+)\)?$/);
    if (m) {
      frames.push({
        function: m[1],
        filename: m[2],
        lineno: Number(m[3]),
        colno: Number(m[4]),
      });
    }
  }
  return frames.reverse(); // envelope wants oldest → newest (deepest last)
}

export function init(opts: InitOptions): void {
  const dsn = new URL(opts.dsn);
  const key = dsn.pathname.split('/').filter(Boolean).pop() ?? '';
  if (!key) throw new Error('Watchtower: DSN missing project key');
  cfg = {
    url: `${dsn.origin}/api/v1/ingest/events`,
    key,
    environment: opts.environment ?? 'production',
    release: opts.release,
    beforeSend: opts.beforeSend,
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      captureException(e.error ?? new Error(e.message));
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      captureException(r instanceof Error ? r : new Error(String(r)));
    });
  }
}

function build(partial: Partial<WtEvent>): WtEvent {
  if (!cfg) throw new Error('Watchtower: init() not called');
  return {
    event_id: uuid(),
    timestamp: new Date().toISOString(),
    environment: cfg.environment,
    release: cfg.release,
    platform: 'javascript',
    sdk: SDK,
    level: 'error',
    ...partial,
  };
}

function send(event: WtEvent): void {
  if (!cfg) return;
  const final = cfg.beforeSend ? cfg.beforeSend(event) : event;
  if (!final) return;
  // ponytail: fire-and-forget, no retry queue. Ingest already accepts arrays
  // so batching upgrade is: buffer + flush every 5s / 30 events.
  void fetch(cfg.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Watchtower-Key': cfg.key,
    },
    body: JSON.stringify([final]),
    keepalive: true,
  }).catch(() => {});
}

export function captureException(err: unknown): string | undefined {
  if (!cfg) return;
  const error = err instanceof Error ? err : new Error(String(err));
  const event = build({
    level: 'error',
    message: error.message,
    exception: {
      type: error.name || 'Error',
      value: error.message,
      stacktrace: error.stack
        ? { frames: parseStack(error.stack) }
        : undefined,
    },
  });
  send(event);
  return event.event_id;
}

export function captureMessage(
  message: string,
  level: Level = 'info',
): string | undefined {
  if (!cfg) return;
  const event = build({ level, message });
  send(event);
  return event.event_id;
}

// Test hook — not exported from package entry point normally, but needed for
// the offline check. Real callers use init/captureException.
export const __internal = {
  reset: (): void => {
    cfg = null;
  },
  build,
  parseStack,
};
