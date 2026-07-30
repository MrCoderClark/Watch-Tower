"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Gauge, Layers, Server, Users, Zap } from "lucide-react";

import { ErrorChart } from "@/components/dashboard/error-chart";
import { IssuesTable } from "@/components/dashboard/issues-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ServicesDonut } from "@/components/dashboard/services-donut";
import { UsersBar } from "@/components/dashboard/users-bar";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import { formatCount } from "@/lib/time";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { ProjectSummary } from "@/types/issues";
import type { HostRow } from "@/types/hosts";
import type { TransactionAgg } from "@/types/transactions";
import type { UptimeCheck } from "@/types/uptime";

interface SystemStatus {
  uptimePct: number | null;
  hostsOnline: number;
  hostsTotal: number;
  txP95Ms: number | null;
}

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const currentProject =
    workspace.status === "ready" ? workspace.currentProject : null;
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);

  useEffect(() => {
    if (!accessToken || !currentProject) return;
    let cancelled = false;
    const slug = currentProject.slug;

    api
      .projectSummary(accessToken, slug)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });

    // System-status widgets — one call per feature area, tolerate failures
    // individually so a broken subsystem doesn't blank the whole card.
    Promise.all([
      api.listUptimeChecks(accessToken, slug).catch(() => [] as UptimeCheck[]),
      api.listHosts(accessToken, slug).catch(() => [] as HostRow[]),
      api.listTransactions(accessToken, slug, 24).catch(() => [] as TransactionAgg[]),
    ]).then(([checks, hosts, txns]) => {
      if (cancelled) return;
      const uptimes = checks
        .map((c) => c.uptime_24h)
        .filter((v): v is number => v != null);
      setSystem({
        uptimePct:
          uptimes.length > 0
            ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length
            : null,
        hostsOnline: hosts.filter((h) => h.online).length,
        hostsTotal: hosts.length,
        txP95Ms:
          txns.length > 0 ? Math.max(...txns.map((t) => t.p95_ms)) : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentProject]);

  const dashLabel = currentProject
    ? `Project: ${currentProject.name}`
    : "No project selected";

  const uptimeTone: "neutral" | "warn" | "danger" =
    system?.uptimePct == null
      ? "neutral"
      : system.uptimePct >= 99
        ? "neutral"
        : system.uptimePct >= 95
          ? "warn"
          : "danger";
  const hostsAllOnline =
    system != null && system.hostsTotal > 0 && system.hostsOnline === system.hostsTotal;

  return (
    <>
      <Header title="Overview" context={dashLabel} />
      <main className="space-y-6 px-8 py-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Unresolved Issues"
            value={summary ? String(summary.unresolved_count) : "—"}
            tone="danger"
            icon={AlertTriangle}
          />
          <KpiCard
            label="Total Events (24h)"
            value={summary ? formatCount(summary.events_24h) : "—"}
            tone="neutral"
            icon={Gauge}
          />
          <KpiCard
            label="Affected Users (24h)"
            value={summary ? formatCount(summary.affected_users_24h) : "—"}
            tone="warn"
            icon={Users}
          />
          <KpiCard
            label="Unique Issues (24h)"
            value={summary ? String(summary.unique_issues_24h) : "—"}
            tone="neutral"
            icon={Layers}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Uptime (24h avg)"
            value={
              system?.uptimePct == null
                ? "—"
                : `${system.uptimePct.toFixed(1)}%`
            }
            tone={uptimeTone}
            icon={Activity}
          />
          <KpiCard
            label="Hosts online"
            value={
              system == null
                ? "—"
                : `${system.hostsOnline} / ${system.hostsTotal}`
            }
            tone={
              system == null || system.hostsTotal === 0
                ? "neutral"
                : hostsAllOnline
                  ? "neutral"
                  : "warn"
            }
            icon={Server}
          />
          <KpiCard
            label="Slowest tx p95"
            value={
              system?.txP95Ms == null
                ? "—"
                : system.txP95Ms < 1000
                  ? `${system.txP95Ms}ms`
                  : `${(system.txP95Ms / 1000).toFixed(2)}s`
            }
            tone={
              system?.txP95Ms == null
                ? "neutral"
                : system.txP95Ms >= 1000
                  ? "danger"
                  : system.txP95Ms >= 300
                    ? "warn"
                    : "neutral"
            }
            icon={Zap}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ErrorChart />
          </div>
          <div className="lg:col-span-4">
            <ServicesDonut />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <IssuesTable />
          </div>
          <div className="lg:col-span-4">
            <UsersBar />
          </div>
        </section>
      </main>
    </>
  );
}
