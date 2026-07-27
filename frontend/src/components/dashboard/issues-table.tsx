"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/time";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Issue } from "@/types/issues";

const GRID =
  "grid-cols-[52px_minmax(0,1fr)_90px_90px_140px_180px] gap-x-6";

export function IssuesTable() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !projectSlug) return;
    let cancelled = false;
    setLoading(true);
    api
      .listIssues(accessToken, projectSlug, { limit: 4, status: "unresolved,regressed" })
      .then((res) => {
        if (!cancelled) {
          setIssues(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIssues([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, projectSlug]);

  return (
    <div className="rounded-xl border border-wt-border bg-wt-bg-2">
      <div className="flex items-center justify-between px-6 pt-5">
        <span className="label-caps">Latest Unresolved Issues</span>
        <Link
          href="/dashboard/issues"
          className="text-sm text-wt-accent-2 hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="mt-4">
        <div className={`grid ${GRID} px-6 pb-3 label-caps`}>
          <span>Status</span>
          <span>Title</span>
          <span>Events</span>
          <span>Users</span>
          <span>Last Seen</span>
          <span>Actions</span>
        </div>
        <div className="border-t border-wt-border-soft">
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-wt-text-muted">
              Loading…
            </div>
          ) : issues.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-wt-text-muted">
              No unresolved issues. Point your SDK at this project&apos;s ingest key to
              start reporting.
            </div>
          ) : (
            issues.map((row) => (
              <div
                key={row.id}
                className={`grid ${GRID} items-center border-b border-wt-border-soft px-6 py-4 text-sm transition-colors last:border-b-0 hover:bg-wt-bg-3/40`}
              >
                <span>
                  <span
                    className="inline-block size-2.5 rounded-full bg-wt-danger"
                    aria-label={row.status}
                  />
                </span>
                <span className="truncate text-wt-text">{row.title}</span>
                <span className="num text-wt-text">
                  {formatCount(row.event_count)}
                </span>
                <span className="num text-wt-text">{row.user_count}</span>
                <span className="text-wt-text-muted">
                  {timeAgo(row.last_seen_at)}
                </span>
                <span className="space-x-4 text-wt-accent-2">
                  <Link
                    href={`/dashboard/issues/${row.id}`}
                    className="hover:underline"
                  >
                    View Details
                  </Link>
                  <button type="button" className="hover:underline">
                    Assign
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
