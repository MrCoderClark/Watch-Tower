"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { UptimeCheck } from "@/types/uptime";

const GRID = "grid-cols-[32px_minmax(0,1fr)_100px_100px_140px_72px] gap-x-6";

function statusDot(status: UptimeCheck["last_status"]): string {
  if (status === "up") return "bg-wt-success";
  if (status === "down") return "bg-wt-danger";
  return "bg-wt-text-dim";
}

export default function UptimePage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;

  const [checks, setChecks] = useState<UptimeCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!accessToken || !projectSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.listUptimeChecks(accessToken, projectSlug);
      setChecks(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 15_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, projectSlug]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setUrl("");
    setInterval(60);
    setShowForm(false);
  }

  function beginEdit(c: UptimeCheck) {
    setEditingId(c.id);
    setName(c.name);
    setUrl(c.url);
    setInterval(c.interval_seconds);
    setShowForm(true);
  }

  async function remove(id: string) {
    if (!accessToken || !projectSlug) return;
    try {
      await api.deleteUptimeCheck(accessToken, projectSlug, id);
      setChecks((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !projectSlug) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateUptimeCheck(accessToken, projectSlug, editingId, {
          name,
          url,
          interval_seconds: interval,
        });
      } else {
        await api.createUptimeCheck(accessToken, projectSlug, {
          name,
          url,
          interval_seconds: interval,
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header
        title="Uptime"
        context={
          workspace.status === "ready" && workspace.currentProject
            ? `Project: ${workspace.currentProject.name}`
            : undefined
        }
      />
      <main className="space-y-4 px-8 py-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-wt-border bg-wt-bg-2 px-3 text-sm text-wt-text hover:bg-wt-bg-3"
          >
            <Plus className="size-4" />
            {showForm ? "Cancel" : "Add check"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={submit}
            className="grid grid-cols-[1fr_2fr_120px_100px] gap-3 rounded-xl border border-wt-border bg-wt-bg-2 p-4"
          >
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g. Marketing site)"
              className="h-9 rounded-md border border-wt-border bg-wt-bg px-3 text-sm text-wt-text focus:outline-none"
            />
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/health"
              className="h-9 rounded-md border border-wt-border bg-wt-bg px-3 text-sm text-wt-text focus:outline-none"
            />
            <input
              type="number"
              min={30}
              max={3600}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="h-9 rounded-md border border-wt-border bg-wt-bg px-3 text-sm text-wt-text focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-9 rounded-md bg-wt-accent-active px-3 text-sm text-wt-text disabled:opacity-60"
            >
              {submitting ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
          </form>
        )}

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
            <span>Name / URL</span>
            <span className="text-right">Uptime 24h</span>
            <span className="text-right">p95</span>
            <span className="text-right">Last check</span>
            <span />
          </div>

          {!loading && checks.length === 0 && !error && (
            <div className="px-6 py-16 text-center text-sm text-wt-text-muted">
              No checks yet. Add one above to start monitoring.
            </div>
          )}

          {checks.map((c) => (
            <div
              key={c.id}
              className={cn(
                `grid ${GRID} items-center border-b border-wt-border-soft px-6 py-4 text-sm last:border-b-0`,
                editingId === c.id && "bg-wt-bg-3/40",
              )}
            >
              <span
                className={cn(
                  "inline-block size-2.5 rounded-full",
                  statusDot(c.last_status),
                )}
                aria-label={c.last_status ?? "unknown"}
              />
              <span className="min-w-0">
                <div className="truncate text-wt-text">{c.name}</div>
                <div className="truncate text-xs text-wt-text-dim">{c.url}</div>
              </span>
              <span className="num text-right text-wt-text">
                {c.uptime_24h == null ? "—" : `${c.uptime_24h.toFixed(1)}%`}
              </span>
              <span className="num text-right text-wt-text-muted">
                {c.latency_p95_ms == null ? "—" : `${c.latency_p95_ms}ms`}
              </span>
              <span className="text-wt-text-muted">
                {c.last_checked_at
                  ? new Date(c.last_checked_at).toLocaleTimeString()
                  : "pending"}
              </span>
              <span className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => beginEdit(c)}
                  aria-label={`Edit ${c.name}`}
                  className="text-wt-text-dim hover:text-wt-text"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="text-wt-text-dim hover:text-wt-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
