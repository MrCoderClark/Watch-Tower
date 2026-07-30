"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { UptimeCheck } from "@/types/uptime";

export default function AlertsPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [checks, setChecks] = useState<UptimeCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !projectSlug) return;
    let cancelled = false;
    setLoading(true);
    api
      .listUptimeChecks(accessToken, projectSlug)
      .then((rows) => {
        if (!cancelled) setChecks(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.detail : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const t = window.setInterval(() => void 0, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [accessToken, projectSlug]);

  const down = checks.filter((c) => c.last_status === "down");

  return (
    <>
      <Header
        title="Alerts"
        context={
          workspace.status === "ready" && workspace.currentProject
            ? `Project: ${workspace.currentProject.name}`
            : undefined
        }
      />
      <main className="space-y-6 px-8 py-6">
        {error && (
          <div className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-4 py-3 text-sm text-wt-danger">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-wt-border bg-wt-bg-2 p-6">
          <div className="mb-3 flex items-center gap-2">
            {down.length === 0 ? (
              <CheckCircle className="size-4 text-wt-success" />
            ) : (
              <AlertTriangle className="size-4 text-wt-danger" />
            )}
            <h2 className="label-caps text-wt-text">Open Incidents</h2>
          </div>

          {loading && checks.length === 0 && (
            <div className="text-sm text-wt-text-muted">Loading…</div>
          )}

          {!loading && down.length === 0 && (
            <p className="text-sm text-wt-text-muted">
              All systems normal. {checks.length}{" "}
              {checks.length === 1 ? "check" : "checks"} being monitored.
            </p>
          )}

          {down.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-t border-wt-border-soft py-3 first:border-t-0 first:pt-0"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-wt-text">{c.name}</div>
                <div className="truncate text-xs text-wt-text-dim">{c.url}</div>
              </div>
              <span className="text-xs text-wt-danger">
                {c.consecutive_failures} consecutive failure
                {c.consecutive_failures === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-wt-border bg-wt-bg-2 p-6">
          <h2 className="label-caps mb-3 text-wt-text">Channels</h2>
          <div className="text-sm text-wt-text-muted">
            Slack webhook is configured via the{" "}
            <code className="rounded bg-wt-bg px-1 text-wt-accent">
              SLACK_WEBHOOK_URL
            </code>{" "}
            env var on the backend. In-app channel management is not yet built;
            add rules and channels via env for now.
          </div>
        </section>

        <section className="rounded-xl border border-wt-border bg-wt-bg-2 p-6">
          <h2 className="label-caps mb-3 text-wt-text">Rules</h2>
          <div className="text-sm text-wt-text-muted">
            One built-in rule: an uptime check firing 2 consecutive failures
            posts to Slack. Configure checks on the{" "}
            <Link href="/dashboard/uptime" className="text-wt-accent hover:underline">
              Uptime page
            </Link>
            . Additional rule kinds (error frequency, p95 breach, host offline)
            are on the roadmap.
          </div>
        </section>
      </main>
    </>
  );
}

// ponytail: no rules/channels tables yet, so this page reads uptime state and
// documents where the config lives. Real rule-editor + alert-history UI comes
// with the alerting-model expansion (spec: alerting.md).