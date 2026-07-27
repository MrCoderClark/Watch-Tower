"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Search } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";

type Point = { t: string; label: string; v: number };

function bucketize(points: { t: string; count: number }[]): Point[] {
  // Fill in the last 24 hours so a mostly-empty project still draws a full axis.
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const map = new Map<string, number>();
  for (const p of points) {
    const d = new Date(p.t);
    d.setMinutes(0, 0, 0);
    map.set(d.toISOString(), (map.get(d.toISOString()) ?? 0) + p.count);
  }
  const out: Point[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const iso = d.toISOString();
    out.push({
      t: iso,
      label: `${String(d.getHours()).padStart(2, "0")}:00`,
      v: map.get(iso) ?? 0,
    });
  }
  return out;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-wt-border bg-wt-bg-3 px-3 py-2 text-xs shadow-lg">
      <div className="num text-lg font-semibold text-wt-text">
        {payload[0].value}
      </div>
      <div className="text-wt-text-muted">
        {payload[0].value} events at {label}
      </div>
    </div>
  );
}

export function ErrorChart() {
  const { accessToken } = useAuth();
  const workspace = useWorkspace();
  const projectSlug =
    workspace.status === "ready" ? workspace.currentProject?.slug : undefined;
  const [data, setData] = useState<Point[]>(() => bucketize([]));

  useEffect(() => {
    if (!accessToken || !projectSlug) return;
    let cancelled = false;
    api
      .projectFrequency(accessToken, projectSlug, "24h")
      .then((res) => {
        if (!cancelled) setData(bucketize(res.points));
      })
      .catch(() => {
        if (!cancelled) setData(bucketize([]));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, projectSlug]);

  const maxV = Math.max(...data.map((p) => p.v), 10);
  const yMax = Math.ceil(maxV * 1.15);

  return (
    <div className="rounded-xl border border-wt-border bg-wt-bg-2">
      <div className="px-6 pt-5">
        <span className="label-caps">Error Events Over Time (24h)</span>
      </div>
      <div className="h-72 px-2 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="errorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#ffffff"
              strokeOpacity={0.06}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#626B82", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: "#626B82", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[0, yMax]}
              allowDecimals={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{
                stroke: "#98A2B8",
                strokeDasharray: "4 4",
                strokeWidth: 1,
              }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#3B82F6"
              strokeWidth={1.75}
              fill="url(#errorFill)"
              activeDot={{
                r: 4,
                stroke: "#3B82F6",
                strokeWidth: 2,
                fill: "#0F131C",
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 border-t border-wt-border-soft px-6 py-4 text-sm">
        <span className="text-wt-text-muted">Time Range</span>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-md border border-wt-border bg-wt-bg-3 px-3 text-wt-text"
        >
          Last 24h <ChevronDown className="size-3.5 text-wt-text-dim" />
        </button>
        <span className="ml-2 text-wt-text-muted">Environment</span>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-md border border-wt-border bg-wt-bg-3 px-3 text-wt-text"
        >
          Production <ChevronDown className="size-3.5 text-wt-text-dim" />
        </button>
        <div className="ml-auto flex h-8 flex-1 max-w-xs items-center gap-2 rounded-md border border-wt-border bg-wt-bg-3 px-3">
          <Search className="size-3.5 text-wt-text-dim" />
          <input
            type="text"
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-wt-text placeholder:text-wt-text-dim focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
