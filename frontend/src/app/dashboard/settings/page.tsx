"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";

import { Header } from "@/components/layout/header";
import { NewKeyDialog } from "@/components/settings/new-key-dialog";
import { api, ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { ProjectKey } from "@/types/keys";

export default function SettingsPage() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;
  const projectName =
    workspace.status === "ready" ? workspace.currentProject?.name : undefined;

  const [keys, setKeys] = useState<ProjectKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !projectSlug) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api.listKeys(accessToken, projectSlug);
      setKeys(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRevoke(id: string) {
    if (!accessToken || !projectSlug) return;
    if (pendingRevoke !== id) {
      setPendingRevoke(id);
      setTimeout(() => {
        setPendingRevoke((cur) => (cur === id ? null : cur));
      }, 4000);
      return;
    }
    try {
      await api.revokeKey(accessToken, projectSlug, id);
      setPendingRevoke(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to revoke key");
    }
  }

  const active = keys.filter((k) => k.revoked_at === null);
  const revoked = keys.filter((k) => k.revoked_at !== null);

  return (
    <>
      <Header
        title="Settings"
        context={projectName ? `Project: ${projectName}` : undefined}
      />
      <main className="space-y-6 px-8 py-6">
        <section className="rounded-xl border border-wt-border bg-wt-bg-2">
          <div className="flex items-start justify-between border-b border-wt-border-soft px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-wt-text">API Keys</h2>
              <p className="mt-1 text-sm text-wt-text-muted">
                Send these to your SDKs and agents in the{" "}
                <code className="rounded bg-wt-bg-3 px-1.5 py-0.5 text-xs text-wt-text">
                  X-Watchtower-Key
                </code>{" "}
                header.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={!projectSlug}
              className="flex h-9 items-center gap-2 rounded-md bg-wt-accent px-4 text-sm font-medium text-white transition-colors hover:bg-wt-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus strokeWidth={2} className="size-4" />
              New key
            </button>
          </div>

          {error && (
            <div className="border-b border-wt-danger/40 bg-wt-danger/10 px-6 py-3 text-sm text-wt-danger">
              {error}
            </div>
          )}

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-wt-text-muted">
              Loading…
            </div>
          ) : active.length === 0 && revoked.length === 0 ? (
            <EmptyState onCreate={() => setDialogOpen(true)} />
          ) : (
            <>
              <KeyList
                keys={active}
                pendingRevoke={pendingRevoke}
                onRevoke={onRevoke}
              />
              {revoked.length > 0 && (
                <>
                  <div className="border-t border-wt-border-soft px-6 py-3 label-caps">
                    Revoked
                  </div>
                  <KeyList
                    keys={revoked}
                    pendingRevoke={null}
                    onRevoke={() => {}}
                    revokedGroup
                  />
                </>
              )}
            </>
          )}
        </section>
      </main>

      {projectSlug && accessToken && (
        <NewKeyDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            void load();
          }}
          projectSlug={projectSlug}
          accessToken={accessToken}
        />
      )}
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-wt-accent-soft">
        <KeyRound strokeWidth={1.5} className="size-6 text-wt-accent-2" />
      </div>
      <div>
        <div className="text-sm font-medium text-wt-text">No keys yet</div>
        <p className="mt-1 text-sm text-wt-text-muted">
          Mint one to point your SDK at this project.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex h-9 items-center gap-2 rounded-md bg-wt-accent px-4 text-sm font-medium text-white transition-colors hover:bg-wt-accent-2"
      >
        <Plus strokeWidth={2} className="size-4" />
        New key
      </button>
    </div>
  );
}

function KeyList({
  keys,
  pendingRevoke,
  onRevoke,
  revokedGroup,
}: {
  keys: ProjectKey[];
  pendingRevoke: string | null;
  onRevoke: (id: string) => void;
  revokedGroup?: boolean;
}) {
  return (
    <div>
      {keys.map((k) => {
        const isPending = pendingRevoke === k.id;
        return (
          <div
            key={k.id}
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)_140px_140px_120px] items-center gap-x-6 border-b border-wt-border-soft px-6 py-4 last:border-b-0",
              revokedGroup && "opacity-60",
            )}
          >
            <span
              className={cn(
                "flex h-5 items-center rounded-full px-2 text-[11px] font-medium uppercase tracking-wider",
                k.kind === "secret"
                  ? "bg-wt-accent-soft text-wt-accent-2"
                  : "bg-wt-bg-3 text-wt-text-muted",
              )}
            >
              {k.kind}
            </span>
            <span className="min-w-0">
              <div className="truncate text-sm text-wt-text">
                {k.label || "Unlabeled"}
              </div>
              <div className="mt-0.5 font-mono text-xs text-wt-text-dim">
                {k.key_prefix}…
              </div>
            </span>
            <span className="text-sm text-wt-text-muted">
              {k.last_used_at ? timeAgo(k.last_used_at) : "Never used"}
            </span>
            <span className="text-sm text-wt-text-muted">
              Created {timeAgo(k.created_at)}
            </span>
            <span className="text-right">
              {!revokedGroup && (
                <button
                  type="button"
                  onClick={() => onRevoke(k.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors",
                    isPending
                      ? "border-wt-danger bg-wt-danger/10 text-wt-danger"
                      : "border-wt-border text-wt-text-muted hover:border-wt-danger hover:text-wt-danger",
                  )}
                >
                  <Trash2 strokeWidth={1.5} className="size-3.5" />
                  {isPending ? "Confirm?" : "Revoke"}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
