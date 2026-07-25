"use client";

// Colocated recharts components for the Intelligence page.
// Chart chrome per LinearDesign chart rules: grid #23252a, ticks #62666d/12,
// tooltip on Carbon with graphite hairline.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

const TICK = { fill: "#62666d", fontSize: 12 };
const TOOLTIP_STYLE = {
  backgroundColor: "#0f1011",
  border: "1px solid #23252a",
  borderRadius: 6,
  color: "#d0d6e0",
  fontSize: 12,
};

export type CountDatum = { name: string; value: number; color: string };

/** Simple vertical count chart — one bar per bucket, palette-colored cells. */
export function CountBarChart({
  data,
  height = 240,
}: {
  data: CountDatum[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#23252a" vertical={false} />
          <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
