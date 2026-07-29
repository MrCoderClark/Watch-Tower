export interface HostRow {
  id: string;
  hostname: string;
  agent_version: string | null;
  last_heartbeat_at: string | null;
  interval_seconds: number;
  online: boolean;
  latest_cpu_pct: number | null;
  latest_mem_pct: number | null;
  latest_disk_pct: number | null;
}

export interface MetricPoint {
  ts: string;
  value: number | null;
}

export interface HostMetricsSeries {
  metric: string;
  points: MetricPoint[];
}
