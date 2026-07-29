"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { TransactionDetail } from "@/types/transactions";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ponytail: indented list, not a flame graph SVG. Flame graph is a future
// upgrade once we have transactions with 20+ spans that need a shape read.
function orderSpans(spans: TransactionDetail["spans"]) {
  const byParent = new Map<string | null, TransactionDetail["spans"]>();
  for (const s of spans) {
    const parent = s.parent_span_id ?? null;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(s);
  }
  const out: { span: TransactionDetail["spans"][number]; depth: number }[] = [];
  function walk(parent: string | null, depth: number) {
    const kids = byParent.get(parent) ?? [];
    kids.sort((a, b) => a.started_at.localeCompare(b.started_at));
    for (const k of kids) {
      out.push({ span: k, depth });
      walk(k.span_id, depth + 1);
    }
  }
  walk(null, 0);
  // Also emit any orphans (parent isn't the root transaction and wasn't seen)
  const seen = new Set(out.map((o) => o.span.span_id));
  for (const s of spans) {
    if (!seen.has(s.span_id)) out.push({ span: s, depth: 0 });
  }
  return out;
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !projectSlug || !params.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getTransaction(accessToken, projectSlug, params.id)
      .then((res) => {
        if (!cancelled) setTxn(res);
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
  }, [accessToken, projectSlug, params.id]);

  const spans = txn ? orderSpans(txn.spans) : [];

  return (
    <>
      <Header
        title="Transaction"
        context={
          workspace.status === "ready" && workspace.currentProject
            ? `Project: ${workspace.currentProject.name}`
            : undefined
        }
      />
      <main className="space-y-6 px-8 py-6">
        <Link
          href="/dashboard/performance"
          className="inline-flex items-center gap-1 text-sm text-wt-text-muted hover:text-wt-text"
        >
          <ChevronLeft className="size-4" /> Back to performance
        </Link>

        {error && (
          <div className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-4 py-3 text-sm text-wt-danger">
            {error}
          </div>
        )}

        {loading && !txn && (
          <div className="text-sm text-wt-text-muted">Loading…</div>
        )}

        {txn && (
          <>
            <div className="rounded-xl border border-wt-border bg-wt-bg-2 px-6 py-5">
              <div className="flex items-baseline gap-3">
                <h1 className="text-lg font-semibold text-wt-text">{txn.name}</h1>
                <span className="text-xs text-wt-text-dim">{txn.op}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-6 text-sm">
                <Stat label="Duration" value={formatMs(txn.duration_ms)} />
                <Stat label="Status" value={txn.status} />
                <Stat label="Environment" value={txn.environment} />
                <Stat
                  label="Started"
                  value={new Date(txn.started_at).toLocaleString()}
                />
              </div>
            </div>

            <section className="rounded-xl border border-wt-border bg-wt-bg-2">
              <div className="border-b border-wt-border-soft px-6 py-3 label-caps">
                Spans ({txn.spans.length})
              </div>
              {spans.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-wt-text-muted">
                  No spans captured for this transaction.
                </div>
              )}
              {spans.map(({ span, depth }) => (
                <div
                  key={span.span_id}
                  className="grid grid-cols-[minmax(0,1fr)_120px] items-start gap-4 border-b border-wt-border-soft px-6 py-3 text-sm last:border-b-0"
                >
                  <div
                    className="min-w-0"
                    style={{ paddingLeft: `${depth * 16}px` }}
                  >
                    <div className="text-xs text-wt-text-dim">{span.op}</div>
                    <div
                      className={cn(
                        "truncate font-mono text-xs text-wt-text",
                        span.op === "db.query" && "text-wt-accent",
                      )}
                    >
                      {span.description ?? "—"}
                    </div>
                  </div>
                  <div className="num text-right text-wt-text">
                    {formatMs(span.duration_ms)}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-caps text-wt-text-dim">{label}</div>
      <div className="mt-1 text-wt-text">{value}</div>
    </div>
  );
}
