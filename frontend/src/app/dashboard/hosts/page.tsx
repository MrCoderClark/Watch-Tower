"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { HostRow, MetricPoint } from "@/types/hosts";

const GRID =
  "grid-cols-[32px_minmax(0,1fr)_80px_80px_80px_120px_140px] gap-x-6";

function formatPct(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(0)}%`;
}

function severity(v: number | null): string {
  if (v == null) return "text-wt-text-dim";
  if (v >= 90) return "text-wt-danger";
  if (v >= 70) return "text-wt-warn";
  return "text-wt-text";
}

function Sparkline({ points }: { points: MetricPoint[] }) {
  if (points.length < 2) {
    return <span className="text-xs text-wt-text-dim">no data</span>;
  }
  const data = points.map((p) => ({ v: p.value ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="currentColor"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function HostsPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [cpuSeries, setCpuSeries] = useState<Record<string, MetricPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!accessToken || !projectSlug) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listHosts(accessToken, projectSlug);
      setHosts(rows);
      // ponytail: N calls for N hosts; if this shows up in perf, add a
      // bulk "series for many hosts" endpoint.
      const series = await Promise.all(
        rows.map((h) =>
          api
            .getHostMetrics(accessToken, projectSlug, h.id, "cpu_pct", "1h")
            .then((s) => [h.id, s.points] as const)
            .catch(() => [h.id, [] as MetricPoint[]] as const),
        ),
      );
      setCpuSeries(Object.fromEntries(series));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, projectSlug]);

  return (
    <>
      <Header
        title="Hosts"
        context={
          workspace.status === "ready" && workspace.currentProject
            ? `Project: ${workspace.currentProject.name}`
            : undefined
        }
      />
      <main className="space-y-4 px-8 py-6">
        {error && (
          <div className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-4 py-3 text-sm text-wt-danger">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-wt-border bg-wt-bg-2">
          <div
            className={`grid ${GRID} label-caps border-b border-wt-border-soft px-6 py-3`}
          >
            <span />
            <span>Hostname</span>
            <span className="text-right">CPU</span>
            <span className="text-right">Mem</span>
            <span className="text-right">Disk</span>
            <span>CPU 1h</span>
            <span className="text-right">Last seen</span>
          </div>

          {!loading && hosts.length === 0 && !error && (
            <div className="px-6 py-16 text-center text-sm text-wt-text-muted">
              No hosts reporting yet. Install the agent (see
              scripts/agent/README) on a machine to start.
            </div>
          )}

          {hosts.map((h) => (
            <div
              key={h.id}
              className={`grid ${GRID} items-center border-b border-wt-border-soft px-6 py-4 text-sm last:border-b-0`}
            >
              <span
                className={cn(
                  "inline-block size-2.5 rounded-full",
                  h.online ? "bg-wt-success" : "bg-wt-danger",
                )}
                aria-label={h.online ? "online" : "offline"}
              />
              <span className="min-w-0">
                <div className="truncate text-wt-text">{h.hostname}</div>
                <div className="truncate text-xs text-wt-text-dim">
                  {h.agent_version ? `agent v${h.agent_version}` : "—"}
                </div>
              </span>
              <span className={cn("num text-right", severity(h.latest_cpu_pct))}>
                {formatPct(h.latest_cpu_pct)}
              </span>
              <span className={cn("num text-right", severity(h.latest_mem_pct))}>
                {formatPct(h.latest_mem_pct)}
              </span>
              <span className={cn("num text-right", severity(h.latest_disk_pct))}>
                {formatPct(h.latest_disk_pct)}
              </span>
              <span className="text-wt-accent">
                <Sparkline points={cpuSeries[h.id] ?? []} />
              </span>
              <span className="text-right text-wt-text-muted">
                {h.last_heartbeat_at
                  ? new Date(h.last_heartbeat_at).toLocaleTimeString()
                  : "never"}
              </span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
