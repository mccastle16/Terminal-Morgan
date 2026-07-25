"use client";

// Overview charts — client-only recharts wrappers. The server page computes
// plain-serializable rows; these components only draw. Dark theme constants
// per the terminal chart rules (grid #23252a, ticks #62666d, Carbon tooltip).

import {
  Bar,
  BarChart,
  CartesianGrid,
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

export type CategorySplitRow = {
  name: string;
  members: number;
  nonMembers: number;
  unknown: number;
};

/** Top categories as horizontal stacked bars — member / non-member / unknown. */
export function MembershipByCategoryChart({ data }: { data: CategorySplitRow[] }) {
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
            width={132}
            tick={TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT}
            labelStyle={{ color: "#8a8f98" }}
            itemStyle={{ color: "#d0d6e0" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
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
