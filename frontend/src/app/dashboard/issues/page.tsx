"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Issue, IssueStatus } from "@/types/issues";

const STATUS_TABS: { key: string; label: string; value: string | undefined }[] = [
  { key: "unresolved", label: "Unresolved", value: "unresolved,regressed" },
  { key: "resolved", label: "Resolved", value: "resolved" },
  { key: "ignored", label: "Ignored", value: "ignored" },
  { key: "all", label: "All", value: undefined },
];

const STATUS_DOT: Record<IssueStatus, string> = {
  unresolved: "bg-wt-danger",
  regressed: "bg-wt-warn",
  resolved: "bg-wt-success",
  ignored: "bg-wt-text-dim",
};

const GRID =
  "grid-cols-[52px_minmax(0,1fr)_100px_100px_140px] gap-x-6";

export default function IssuesPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [tab, setTab] = useState("unresolved");
  const [q, setQ] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !projectSlug) return;
    let cancelled = false;
    const status = STATUS_TABS.find((t) => t.key === tab)?.value;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      api
        .listIssues(accessToken, projectSlug, {
          status,
          q: q.trim() || undefined,
          limit: 25,
        })
        .then((res) => {
          if (cancelled) return;
          setIssues(res.items);
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
  }, [accessToken, projectSlug, tab, q]);

  async function loadMore() {
    if (!accessToken || !projectSlug || !nextCursor) return;
    const status = STATUS_TABS.find((t) => t.key === tab)?.value;
    setLoading(true);
    try {
      const res = await api.listIssues(accessToken, projectSlug, {
        status,
        q: q.trim() || undefined,
        cursor: nextCursor,
        limit: 25,
      });
      setIssues((prev) => [...prev, ...res.items]);
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
        title="Issues"
        context={workspace.status === "ready" && workspace.currentProject
          ? `Project: ${workspace.currentProject.name}`
          : undefined}
      />
      <main className="space-y-4 px-8 py-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-wt-border bg-wt-bg-2 p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm transition-colors",
                  tab === t.key
                    ? "bg-wt-accent-active text-wt-text"
                    : "text-wt-text-muted hover:text-wt-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-md border border-wt-border bg-wt-bg-2 px-3">
            <Search className="size-4 text-wt-text-dim" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles"
              className="flex-1 bg-transparent text-sm text-wt-text placeholder:text-wt-text-dim focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-wt-border bg-wt-bg-2">
          <div className={`grid ${GRID} px-6 py-3 label-caps border-b border-wt-border-soft`}>
            <span>Status</span>
            <span>Title</span>
            <span>Events</span>
            <span>Users</span>
            <span>Last Seen</span>
          </div>

          {error && (
            <div className="border-b border-wt-danger/40 bg-wt-danger/10 px-6 py-3 text-sm text-wt-danger">
              {error}
            </div>
          )}

          {!loading && issues.length === 0 && !error && (
            <div className="px-6 py-16 text-center text-sm text-wt-text-muted">
              No issues match.
            </div>
          )}

          {issues.map((row) => (
            <Link
              key={row.id}
              href={`/dashboard/issues/${row.id}`}
              className={`grid ${GRID} items-center border-b border-wt-border-soft px-6 py-4 text-sm transition-colors last:border-b-0 hover:bg-wt-bg-3/40`}
            >
              <span>
                <span
                  className={cn("inline-block size-2.5 rounded-full", STATUS_DOT[row.status])}
                  aria-label={row.status}
                />
              </span>
              <span className="min-w-0">
                <div className="truncate text-wt-text">{row.title}</div>
                {row.culprit && (
                  <div className="truncate text-xs text-wt-text-dim">
                    {row.culprit}
                  </div>
                )}
              </span>
              <span className="num text-wt-text">{formatCount(row.event_count)}</span>
              <span className="num text-wt-text">{row.user_count}</span>
              <span className="text-wt-text-muted">{timeAgo(row.last_seen_at)}</span>
            </Link>
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
