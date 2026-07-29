"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { LogRow } from "@/types/logs";

const LEVELS = ["all", "debug", "info", "warning", "error", "fatal"] as const;

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-wt-text-dim",
  info: "text-wt-text-muted",
  warning: "text-wt-warn",
  error: "text-wt-danger",
  fatal: "text-wt-danger",
};

export default function LogsPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [service, setService] = useState("");

  useEffect(() => {
    if (!accessToken || !projectSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      api
        .listLogs(accessToken, projectSlug, {
          q: q.trim() || undefined,
          level: level === "all" ? undefined : level,
          service: service.trim() || undefined,
          limit: 100,
        })
        .then((res) => {
          if (cancelled) return;
          setLogs(res.items);
          setNextCursor(res.next_cursor);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.detail : "Failed to load");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [accessToken, projectSlug, q, level, service]);

  async function loadMore() {
    if (!accessToken || !projectSlug || !nextCursor) return;
    setLoading(true);
    try {
      const res = await api.listLogs(accessToken, projectSlug, {
        q: q.trim() || undefined,
        level: level === "all" ? undefined : level,
        service: service.trim() || undefined,
        cursor: nextCursor,
        limit: 100,
      });
      setLogs((prev) => [...prev, ...res.items]);
      setNextCursor(res.next_cursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Logs"
        context={
          workspace.status === "ready" && workspace.currentProject
            ? `Project: ${workspace.currentProject.name}`
            : undefined
        }
      />
      <main className="space-y-4 px-8 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 flex-1 min-w-[280px] max-w-md items-center gap-2 rounded-md border border-wt-border bg-wt-bg-2 px-3">
            <Search className="size-4 text-wt-text-dim" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Full-text search"
              className="flex-1 bg-transparent text-sm text-wt-text placeholder:text-wt-text-dim focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-wt-border bg-wt-bg-2 p-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm transition-colors",
                  level === l
                    ? "bg-wt-accent-active text-wt-text"
                    : "text-wt-text-muted hover:text-wt-text",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Service"
            className="h-9 w-40 rounded-md border border-wt-border bg-wt-bg-2 px-3 text-sm text-wt-text placeholder:text-wt-text-dim focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-4 py-3 text-sm text-wt-danger">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-wt-border bg-wt-bg-2">
          {!loading && logs.length === 0 && !error && (
            <div className="px-6 py-16 text-center text-sm text-wt-text-muted">
              No logs match.
            </div>
          )}

          {logs.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[140px_60px_120px_minmax(0,1fr)] gap-4 border-b border-wt-border-soft px-6 py-2 font-mono text-xs last:border-b-0"
            >
              <span className="text-wt-text-dim">
                {new Date(row.occurred_at).toISOString().slice(11, 23)}
              </span>
              <span
                className={cn(
                  "uppercase",
                  LEVEL_COLOR[row.level] ?? "text-wt-text",
                )}
              >
                {row.level}
              </span>
              <span className="truncate text-wt-text-muted">
                {row.service ?? "—"}
              </span>
              <span className="min-w-0 truncate text-wt-text" title={row.message}>
                {row.message}
              </span>
            </div>
          ))}

          {nextCursor && (
            <div className="flex justify-center border-t border-wt-border-soft py-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="h-9 rounded-md border border-wt-border px-5 text-sm text-wt-text hover:bg-wt-bg-3 disabled:opacity-60"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
