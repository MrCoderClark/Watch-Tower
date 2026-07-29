export interface UptimeCheck {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  is_enabled: boolean;
  last_status: "up" | "down" | null;
  consecutive_failures: number;
  last_checked_at: string | null;
  uptime_24h: number | null;
  latency_p95_ms: number | null;
}

export interface UptimeCheckCreate {
  name: string;
  url: string;
  interval_seconds?: number;
}
