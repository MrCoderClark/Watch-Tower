"use client";

import { AlertTriangle, Gauge, Timer, Users } from "lucide-react";

import { Header } from "@/components/layout/header";
import { useAuth } from "@/providers/auth-provider";

const KPIS = [
  {
    label: "Unresolved Issues",
    value: "0",
    delta: null,
    tone: "danger" as const,
    icon: AlertTriangle,
  },
  {
    label: "Total Events",
    value: "0",
    delta: null,
    tone: "neutral" as const,
    icon: Gauge,
  },
  {
    label: "Affected Users",
    value: "0",
    delta: null,
    tone: "warn" as const,
    icon: Users,
  },
  {
    label: "Uptime (24h)",
    value: "—",
    delta: null,
    tone: "neutral" as const,
    icon: Timer,
  },
];

const TONE_BG: Record<"neutral" | "danger" | "warn", string> = {
  neutral: "bg-wt-bg-2",
  danger: "bg-[color:var(--wt-danger-soft)]",
  warn: "bg-[color:var(--wt-warn-soft)]",
};

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <>
      <Header
        title="Overview Dashboard"
        context={`Signed in as ${user?.email ?? ""}`}
      />
      <main className="space-y-6 px-8 py-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {KPIS.map(({ label, value, tone, icon: Icon }) => (
            <div
              key={label}
              className={`rounded-xl border border-wt-border ${TONE_BG[tone]} p-5`}
            >
              <div className="flex items-start justify-between">
                <span className="label-caps">{label}</span>
                <Icon strokeWidth={1.5} className="size-5 text-wt-text-dim" />
              </div>
              <div className="num mt-4 text-[44px] font-semibold leading-none tracking-tight text-wt-text">
                {value}
              </div>
              <div className="mt-3 text-xs text-wt-text-dim">No data yet</div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-wt-border bg-wt-bg-2 p-6">
          <div className="flex items-center justify-between">
            <h2 className="label-caps">Getting Started</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-wt-text-muted">
            <p>
              You&apos;re signed in. Nothing is being reported yet — that&apos;s
              expected.
            </p>
            <ol className="list-inside list-decimal space-y-1 text-wt-text">
              <li>Create a project (coming next).</li>
              <li>Grab a project key and drop the SDK into your app.</li>
              <li>Watch this dashboard light up.</li>
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
