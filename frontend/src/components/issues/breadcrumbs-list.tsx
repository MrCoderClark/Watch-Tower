"use client";

import {
  Bug,
  Circle,
  Globe,
  MousePointerClick,
  Navigation,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BreadcrumbEntry } from "@/types/issues";

const CATEGORY_ICON: Record<
  string,
  { icon: typeof Bug; className: string }
> = {
  ui: { icon: MousePointerClick, className: "text-wt-accent-2" },
  "ui.click": { icon: MousePointerClick, className: "text-wt-accent-2" },
  http: { icon: Globe, className: "text-wt-warn" },
  console: { icon: Terminal, className: "text-wt-text-muted" },
  navigation: { icon: Navigation, className: "text-wt-accent-2" },
  error: { icon: Bug, className: "text-wt-danger" },
};

export function BreadcrumbsList({ items }: { items: BreadcrumbEntry[] }) {
  return (
    <div className="rounded-xl border border-wt-border bg-wt-bg-2">
      <div className="border-b border-wt-border-soft px-6 py-4">
        <span className="label-caps">Breadcrumbs</span>
      </div>
      {items.length === 0 ? (
        <div className="px-6 py-6 text-sm text-wt-text-muted">None recorded.</div>
      ) : (
        <ol className="divide-y divide-wt-border-soft">
          {items.map((b, i) => {
            const meta =
              (b.category && CATEGORY_ICON[b.category]) ||
              { icon: Circle, className: "text-wt-text-dim" };
            const Icon = meta.icon;
            return (
              <li key={i} className="grid grid-cols-[24px_100px_1fr_100px] items-start gap-3 px-6 py-3">
                <Icon strokeWidth={1.5} className={cn("size-4 mt-0.5", meta.className)} />
                <span className="font-mono text-xs text-wt-text-muted">
                  {b.category ?? b.type ?? "—"}
                </span>
                <span className="min-w-0">
                  <div className="text-sm text-wt-text">{b.message ?? "—"}</div>
                  {b.data && Object.keys(b.data).length > 0 && (
                    <div className="mt-1 font-mono text-xs text-wt-text-dim">
                      {Object.entries(b.data).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          {k}={JSON.stringify(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </span>
                <span className="text-right font-mono text-xs text-wt-text-dim">
                  {b.timestamp ? new Date(b.timestamp).toLocaleTimeString() : ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
