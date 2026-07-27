"use client";

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

const DATA = [
  { t: "00:00", v: 40 },
  { t: "01:00", v: 60 },
  { t: "02:00", v: 55 },
  { t: "03:00", v: 70 },
  { t: "04:00", v: 90 },
  { t: "05:00", v: 120 },
  { t: "06:00", v: 100 },
  { t: "07:00", v: 130 },
  { t: "08:00", v: 180 },
  { t: "09:00", v: 220 },
  { t: "10:00", v: 260 },
  { t: "11:00", v: 300 },
  { t: "12:00", v: 340 },
  { t: "13:00", v: 480 },
  { t: "14:00", v: 830 },
  { t: "15:00", v: 460 },
  { t: "16:00", v: 380 },
  { t: "17:00", v: 850 },
  { t: "18:00", v: 220 },
  { t: "19:00", v: 140 },
  { t: "20:00", v: 90 },
];

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
  return (
    <div className="rounded-xl border border-wt-border bg-wt-bg-2">
      <div className="px-6 pt-5">
        <span className="label-caps">Error Events Over Time (24h)</span>
      </div>
      <div className="h-72 px-2 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={DATA}
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
              dataKey="t"
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
              domain={[0, 900]}
              ticks={[0, 250, 500, 750, 900]}
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
