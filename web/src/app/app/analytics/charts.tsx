"use client";

// Analytics charts — client-only recharts wrappers fed plain-serializable
// rows from the server page. Dark theme per the terminal chart rules:
// grid #23252a, ticks #62666d/12px, Carbon tooltip, series palette in order
// #d0d6e0 → #6366f1 → #8b5cf6 → #02b8cc → #27a644; acid lime (#e4f222) only
// ever highlights a single emphasized datum.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TICK = { fill: "#62666d", fontSize: 12 };
const TOOLTIP_CONTENT = {
  background: "#0f1011",
  border: "1px solid #23252a",
  borderRadius: 6,
  color: "#d0d6e0",
};
const SERIES = ["#d0d6e0", "#6366f1", "#8b5cf6", "#02b8cc", "#27a644"];

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={TOOLTIP_CONTENT}
      labelStyle={{ color: "#8a8f98" }}
      itemStyle={{ color: "#d0d6e0" }}
      cursor={{ fill: "rgba(255,255,255,0.04)" }}
    />
  );
}

export type NamedValue = { name: string; value: number };

/** Donut split (membership, validation tiers) — labelled by the adjacent
 *  server-rendered list, not a chart legend. */
export function DonutChart({ data, height = 208 }: { data: NamedValue[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={84}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES[i % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_CONTENT}
            labelStyle={{ color: "#8a8f98" }}
            itemStyle={{ color: "#d0d6e0" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Rating buckets — single primary series, vertical bars. */
export function RatingBucketsChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div style={{ height: 208 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
          <CartesianGrid stroke="#23252a" vertical={false} />
          <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} />
          {ChartTooltip()}
          <Bar dataKey="count" name="Businesses" fill="#d0d6e0" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type PenetrationRow = {
  name: string;
  members: number;
  nonMembers: number;
  unknown: number;
};

/** Horizontal stacked penetration bars — member / non-member / unknown. */
export function PenetrationChart({ data }: { data: PenetrationRow[] }) {
  return (
    <div style={{ height: data.length * 28 + 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 12, top: 4, bottom: 0 }}
        >
          <CartesianGrid stroke="#23252a" horizontal={false} />
          <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={TICK}
            axisLine={false}
            tickLine={false}
          />
          {ChartTooltip()}
          <Bar dataKey="members" name="Members" stackId="a" fill="#d0d6e0" />
          <Bar dataKey="nonMembers" name="Non-members" stackId="a" fill="#6366f1" />
          <Bar
            dataKey="unknown"
            name="Unknown"
            stackId="a"
            fill="#8b5cf6"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Category whitespace — untapped pool per category. The single largest pool
 *  is the one emphasized datum (acid lime); everything else stays primary. */
export function WhitespaceChart({ data }: { data: NamedValue[] }) {
  return (
    <div style={{ height: data.length * 28 + 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 12, top: 4, bottom: 0 }}
        >
          <CartesianGrid stroke="#23252a" horizontal={false} />
          <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={TICK}
            axisLine={false}
            tickLine={false}
          />
          {ChartTooltip()}
          <Bar dataKey="value" name="Untapped" radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#e4f222" : "#d0d6e0"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
