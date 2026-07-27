"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { ApiError } from "@/lib/api";
import { useWorkspace } from "@/providers/workspace-provider";

const PLATFORMS = [
  { value: "javascript", label: "JavaScript / TypeScript" },
  { value: "python", label: "Python" },
  { value: "node", label: "Node.js" },
  { value: "go", label: "Go" },
  { value: "ruby", label: "Ruby" },
  { value: "other", label: "Other" },
];

export function NewProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createProject } = useWorkspace();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("javascript");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setPlatform("javascript");
      setError(null);
      setBusy(false);
      const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createProject({ name: name.trim(), platform });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create project");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-wt-border bg-wt-bg-2 p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="new-project-title" className="text-lg font-semibold text-wt-text">
              New project
            </h2>
            <p className="text-sm text-wt-text-muted">
              Projects hold your ingest keys and dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-wt-text-dim hover:bg-wt-bg-3 hover:text-wt-text"
          >
            <X strokeWidth={1.5} className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="project-name" className="label-caps">
              Name
            </label>
            <input
              id="project-name"
              ref={firstFieldRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Web App"
              className="h-10 w-full rounded-md border border-wt-border bg-wt-bg-3 px-3 text-sm text-wt-text placeholder:text-wt-text-dim focus:border-wt-accent focus:outline-none focus:ring-2 focus:ring-wt-accent/60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="project-platform" className="label-caps">
              Platform
            </label>
            <select
              id="project-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-10 w-full rounded-md border border-wt-border bg-wt-bg-3 px-3 text-sm text-wt-text focus:border-wt-accent focus:outline-none focus:ring-2 focus:ring-wt-accent/60"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-3 py-2 text-sm text-wt-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-9 rounded-md border border-wt-border px-4 text-sm text-wt-text hover:bg-wt-bg-3 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="h-9 rounded-md bg-wt-accent px-4 text-sm font-medium text-white transition-colors hover:bg-wt-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
