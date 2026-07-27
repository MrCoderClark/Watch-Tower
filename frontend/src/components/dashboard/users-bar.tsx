"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

const DATA = [
  { name: "1", v: 1200 },
  { name: "2", v: 950 },
  { name: "3", v: 720 },
  { name: "4", v: 520 },
  { name: "5", v: 360 },
];

export function UsersBar() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-wt-border bg-wt-bg-2 p-6">
      <span className="label-caps">Most Affected Users (Top 5)</span>
      <div className="mt-2 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} margin={{ top: 12, right: 4, left: 4, bottom: 4 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#626B82", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Bar
              dataKey="v"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
