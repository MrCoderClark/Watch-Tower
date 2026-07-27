"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Gauge, Layers, Users } from "lucide-react";

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

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const currentProject =
    workspace.status === "ready" ? workspace.currentProject : null;
  const [summary, setSummary] = useState<ProjectSummary | null>(null);

  useEffect(() => {
    if (!accessToken || !currentProject) return;
    let cancelled = false;
    api
      .projectSummary(accessToken, currentProject.slug)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, currentProject]);

  const dashLabel = currentProject
    ? `Project: ${currentProject.name}`
    : "No project selected";

  return (
    <>
      <Header title="Error Tracking Dashboard" context={dashLabel} />
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
