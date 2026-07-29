"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, EyeOff, RotateCcw } from "lucide-react";

import { BreadcrumbsList } from "@/components/issues/breadcrumbs-list";
import { KvPanel } from "@/components/issues/kv-panel";
import { StackTrace } from "@/components/issues/stack-trace";
import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { IssueDetail, IssueStatus } from "@/types/issues";

const STATUS_ACTIONS: {
  key: "unresolved" | "resolved" | "ignored";
  label: string;
  icon: typeof Check;
}[] = [
  { key: "unresolved", label: "Unresolved", icon: RotateCcw },
  { key: "resolved", label: "Resolved", icon: Check },
  { key: "ignored", label: "Ignored", icon: EyeOff },
];

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !projectSlug) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getIssue(accessToken, projectSlug, id);
      setIssue(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectSlug, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(
    next: "unresolved" | "resolved" | "ignored",
  ) {
    if (!accessToken || !projectSlug || !issue) return;
    try {
      const updated = await api.updateIssue(accessToken, projectSlug, id, {
        status: next,
      });
      setIssue({ ...issue, status: updated.status as IssueStatus });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update");
    }
  }

  return (
    <>
      <Header title="Issue" context={workspace.status === "ready" && workspace.currentProject
        ? `Project: ${workspace.currentProject.name}`
        : undefined} />
      <main className="space-y-6 px-8 py-6">
        <Link
          href="/dashboard/issues"
          className="inline-flex items-center gap-1.5 text-sm text-wt-text-muted hover:text-wt-text"
        >
          <ArrowLeft strokeWidth={1.5} className="size-4" />
          Back to issues
        </Link>

        {error && (
          <div className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-4 py-3 text-sm text-wt-danger">
            {error}
          </div>
        )}

        {loading && !issue ? (
          <div className="rounded-xl border border-wt-border bg-wt-bg-2 px-6 py-10 text-center text-sm text-wt-text-muted">
            Loading…
          </div>
        ) : issue ? (
          <>
            <IssueHeader issue={issue} onStatus={updateStatus} />
            <IssueStats issue={issue} />
            <IssueBody issue={issue} />
          </>
        ) : null}
      </main>
    </>
  );
}

function IssueHeader({
  issue,
  onStatus,
}: {
  issue: IssueDetail;
  onStatus: (s: "unresolved" | "resolved" | "ignored") => void;
}) {
  const activeStatus: "unresolved" | "resolved" | "ignored" =
    issue.status === "regressed" ? "unresolved" : issue.status;

  return (
    <div className="flex flex-wrap items-start justify-between gap-6 rounded-xl border border-wt-border bg-wt-bg-2 px-6 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-block size-2.5 rounded-full",
              issue.status === "resolved"
                ? "bg-wt-success"
                : issue.status === "ignored"
                  ? "bg-wt-text-dim"
                  : issue.status === "regressed"
                    ? "bg-wt-warn"
                    : "bg-wt-danger",
            )}
          />
          <h1 className="truncate text-xl font-semibold text-wt-text">
            {issue.title}
          </h1>
          {issue.status === "regressed" && (
            <span className="rounded bg-wt-warn/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-wt-warn">
              Regressed
            </span>
          )}
        </div>
        {issue.culprit && (
          <div className="mt-1 font-mono text-sm text-wt-text-muted">
            {issue.culprit}
          </div>
        )}
      </div>

      <div className="inline-flex items-center rounded-lg border border-wt-border bg-wt-bg-1 p-1">
        {STATUS_ACTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onStatus(key)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
              activeStatus === key
                ? "bg-wt-accent-active text-wt-text"
                : "text-wt-text-muted hover:text-wt-text",
            )}
          >
            <Icon strokeWidth={1.5} className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function IssueStats({ issue }: { issue: IssueDetail }) {
  const cells: [string, string][] = [
    ["Events", formatCount(issue.event_count)],
    ["Users", String(issue.user_count)],
    ["First Seen", timeAgo(issue.first_seen_at)],
    ["Last Seen", timeAgo(issue.last_seen_at)],
    [
      "Environment",
      issue.sample_event?.environment ?? "—",
    ],
    ["Release", issue.sample_event?.release ?? "—"],
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-wt-border bg-wt-bg-2 px-6 py-5 md:grid-cols-3 lg:grid-cols-6">
      {cells.map(([k, v]) => (
        <div key={k}>
          <div className="label-caps">{k}</div>
          <div className="num mt-1 text-lg font-medium text-wt-text truncate">
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

function IssueBody({ issue }: { issue: IssueDetail }) {
  const e = issue.sample_event;
  if (!e) {
    return (
      <div className="rounded-xl border border-wt-border bg-wt-bg-2 px-6 py-10 text-center text-sm text-wt-text-muted">
        This issue has no persisted events. That&apos;s unusual — was the event
        purged?
      </div>
    );
  }

  const frames = e.exception?.stacktrace?.frames ?? [];
  const requestHeaders =
    e.request && typeof e.request.headers === "object" && e.request.headers !== null
      ? (e.request.headers as Record<string, unknown>)
      : null;
  const requestSummary: Record<string, unknown> | null = e.request
    ? {
        method: e.request.method,
        url: e.request.url,
      }
    : null;
  const contexts: Record<string, unknown> = {};
  if (e.browser_name)
    contexts.browser = `${e.browser_name}${e.browser_version ? ` ${e.browser_version}` : ""}`;
  if (e.os_name)
    contexts.os = `${e.os_name}${e.os_version ? ` ${e.os_version}` : ""}`;
  if (e.sdk_name)
    contexts.sdk = `${e.sdk_name}${e.sdk_version ? ` ${e.sdk_version}` : ""}`;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {frames.length > 0 ? (
          <StackTrace frames={frames} />
        ) : (
          e.message && (
            <div className="rounded-xl border border-wt-border bg-wt-bg-2 px-6 py-5">
              <div className="label-caps">Message</div>
              <p className="mt-2 font-mono text-sm text-wt-text">{e.message}</p>
            </div>
          )
        )}
        {requestSummary && (
          <KvPanel label="Request" data={requestSummary} />
        )}
        {requestHeaders && (
          <KvPanel label="Request Headers" data={requestHeaders} />
        )}
        <BreadcrumbsList items={e.breadcrumbs} />
      </div>

      <div className="space-y-4">
        <KvPanel label="Tags" data={e.tags} empty="No tags." />
        <KvPanel label="User" data={e.user} empty="No user info." />
        <KvPanel label="Contexts" data={contexts} empty="No context info." />
      </div>
    </div>
  );
}
