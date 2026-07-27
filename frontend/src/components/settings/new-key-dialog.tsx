"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Info, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { ProjectKeyCreated, ProjectKeyKind } from "@/types/keys";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (key: ProjectKeyCreated) => void;
  projectSlug: string;
  accessToken: string;
};

export function NewKeyDialog({
  open,
  onClose,
  onCreated,
  projectSlug,
  accessToken,
}: Props) {
  const [kind, setKind] = useState<ProjectKeyKind>("secret");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ProjectKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setKind("secret");
      setLabel("");
      setError(null);
      setBusy(false);
      setCreated(null);
      setCopied(false);
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
    setBusy(true);
    setError(null);
    try {
      const key = await api.createKey(accessToken, projectSlug, {
        kind,
        label: label.trim() || undefined,
      });
      setCreated(key);
      onCreated(key);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create key");
    } finally {
      setBusy(false);
    }
  }

  async function copyPlaintext() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard failed; fallback: select-and-copy hint. skip for now.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-key-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-wt-border bg-wt-bg-2 p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="new-key-title" className="text-lg font-semibold text-wt-text">
              {created ? "Key created" : "New API key"}
            </h2>
            <p className="text-sm text-wt-text-muted">
              {created
                ? "Copy this key now — you won't see it again."
                : "Keys authenticate SDKs and agents against this project."}
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

        {created ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-md border border-wt-warn/40 bg-wt-warn/10 px-3 py-2 text-xs text-wt-warn flex gap-2">
              <Info strokeWidth={1.5} className="size-4 shrink-0 mt-0.5" />
              <span>
                Only the hashed value is stored on the server. If you lose it,
                revoke and mint a new one.
              </span>
            </div>
            <div className="space-y-2">
              <label className="label-caps">Key</label>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  readOnly
                  value={created.plaintext}
                  onClick={(e) => e.currentTarget.select()}
                  className="h-10 flex-1 rounded-md border border-wt-border bg-wt-bg-3 px-3 font-mono text-xs text-wt-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyPlaintext}
                  className="flex h-10 items-center gap-2 rounded-md bg-wt-accent px-3 text-sm font-medium text-white hover:bg-wt-accent-2"
                >
                  {copied ? (
                    <>
                      <Check strokeWidth={2} className="size-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy strokeWidth={1.5} className="size-4" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-md bg-wt-bg-3 px-4 text-sm text-wt-text hover:bg-wt-border"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="label-caps">Kind</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKind("secret")}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    kind === "secret"
                      ? "border-wt-accent bg-wt-accent-soft"
                      : "border-wt-border bg-wt-bg-3 hover:border-wt-text-dim"
                  }`}
                >
                  <div className="text-sm font-medium text-wt-text">Secret</div>
                  <div className="mt-1 text-xs text-wt-text-muted">
                    Server SDKs, agents, full ingest.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setKind("public")}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    kind === "public"
                      ? "border-wt-accent bg-wt-accent-soft"
                      : "border-wt-border bg-wt-bg-3 hover:border-wt-text-dim"
                  }`}
                >
                  <div className="text-sm font-medium text-wt-text">Public</div>
                  <div className="mt-1 text-xs text-wt-text-muted">
                    Browser SDKs, events + logs only.
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="key-label" className="label-caps">
                Label{" "}
                <span className="text-wt-text-dim normal-case tracking-normal">
                  (optional)
                </span>
              </label>
              <input
                id="key-label"
                ref={firstFieldRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={120}
                placeholder="production backend"
                className="h-10 w-full rounded-md border border-wt-border bg-wt-bg-3 px-3 text-sm text-wt-text placeholder:text-wt-text-dim focus:border-wt-accent focus:outline-none focus:ring-2 focus:ring-wt-accent/60"
              />
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
                disabled={busy}
                className="h-9 rounded-md bg-wt-accent px-4 text-sm font-medium text-white transition-colors hover:bg-wt-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
