"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const DATA = [
  { name: "Api-Gateway", value: 45, color: "#3B82F6" },
  { name: "Frontend", value: 20, color: "#60A5FA" },
  { name: "Payment-Svc", value: 15, color: "#F59E0B" },
  { name: "Paym-Svc", value: 8, color: "#FBBF24" },
  { name: "Others", value: 12, color: "#94A3B8" },
];

const RADIAN = Math.PI / 180;

type LabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  index: number;
};

function FloatingLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  index,
}: LabelProps) {
  const d = DATA[index];
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const anchor = x >= cx ? "start" : "end";
  return (
    <g>
      <text
        x={x}
        y={y - 6}
        textAnchor={anchor}
        fill="var(--wt-text-muted)"
        fontSize={11}
      >
        {d.name}
      </text>
      <text
        x={x}
        y={y + 10}
        textAnchor={anchor}
        fill={d.color}
        fontSize={13}
        fontWeight={600}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {d.value}%
      </text>
    </g>
  );
}

export function ServicesDonut() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-wt-border bg-wt-bg-2 p-6">
      <span className="label-caps">Issues by Service</span>
      <div className="mt-4 flex-1 min-h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 60, left: 60, bottom: 10 }}>
            <Pie
              data={DATA}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              paddingAngle={1}
              stroke="none"
              label={FloatingLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {DATA.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
