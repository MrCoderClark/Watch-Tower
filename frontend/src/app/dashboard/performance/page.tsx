"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { TransactionAgg } from "@/types/transactions";

const GRID = "grid-cols-[minmax(0,1fr)_80px_80px_80px_80px_80px] gap-x-6";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function severityFor(p95: number): string {
  if (p95 >= 1000) return "bg-wt-danger";
  if (p95 >= 300) return "bg-wt-warn";
  return "bg-wt-success";
}

export default function PerformancePage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [rows, setRows] = useState<TransactionAgg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function drillIn(name: string) {
    if (!accessToken || !projectSlug) return;
    const slowest = await api.slowestTransactionsByName(
      accessToken,
      projectSlug,
      name,
    );
    if (slowest.length > 0) {
      router.push(`/dashboard/performance/${slowest[0].id}`);
    }
  }

  useEffect(() => {
    if (!accessToken || !projectSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listTransactions(accessToken, projectSlug, 24)
      .then((res) => {
        if (!cancelled) setRows(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.detail : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, projectSlug]);

  return (
    <>
      <Header
        title="Performance"
        context={
          workspace.status === "ready" && workspace.currentProject
            ? `Project: ${workspace.currentProject.name}`
            : undefined
        }
      />
      <main className="space-y-4 px-8 py-6">
        <div className="rounded-xl border border-wt-border bg-wt-bg-2">
          <div
            className={`grid ${GRID} label-caps border-b border-wt-border-soft px-6 py-3`}
          >
            <span>Transaction</span>
            <span className="text-right">Count</span>
            <span className="text-right">p50</span>
            <span className="text-right">p95</span>
            <span className="text-right">p99</span>
            <span className="text-right">Errors</span>
          </div>

          {error && (
            <div className="border-b border-wt-danger/40 bg-wt-danger/10 px-6 py-3 text-sm text-wt-danger">
              {error}
            </div>
          )}

          {!loading && rows.length === 0 && !error && (
            <div className="px-6 py-16 text-center text-sm text-wt-text-muted">
              No transactions in the last 24h.
            </div>
          )}

          {rows.map((r) => (
            <button
              type="button"
              key={`${r.op}::${r.name}`}
              onClick={() => drillIn(r.name)}
              className={`grid ${GRID} w-full items-center border-b border-wt-border-soft px-6 py-4 text-left text-sm transition-colors last:border-b-0 hover:bg-wt-bg-3/40`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "inline-block size-2.5 rounded-full",
                    severityFor(r.p95_ms),
                  )}
                />
                <span className="min-w-0">
                  <div className="truncate text-wt-text">{r.name}</div>
                  <div className="truncate text-xs text-wt-text-dim">{r.op}</div>
                </span>
              </span>
              <span className="num text-right text-wt-text">{r.count}</span>
              <span className="num text-right text-wt-text-muted">
                {formatMs(r.p50_ms)}
              </span>
              <span className="num text-right text-wt-text">
                {formatMs(r.p95_ms)}
              </span>
              <span className="num text-right text-wt-text-muted">
                {formatMs(r.p99_ms)}
              </span>
              <span className="num text-right text-wt-text-muted">
                {(r.error_rate * 100).toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
