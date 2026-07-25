import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { PageHeader, StatCard, EmptyState } from "@/components/terminal/ui";
import { GraphExplorer } from "./explorer";

export const metadata: Metadata = { title: "Graph — CO_ Network" };

type GraphStats = {
  total_businesses: number;
  total_edges: number;
  exported_nodes: number;
  exported_links: number;
};

export default async function GraphPage() {
  const session = await getSession();
  if (!hasPermission(session.role, "view_analytics")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const raw = await readFile(
    path.join(process.cwd(), "public/ldata/graph_stats.json"),
    "utf-8"
  );
  const stats = JSON.parse(raw) as GraphStats;

  return (
    <div className="space-y-8">
      <PageHeader
        section="Insights"
        title="Graph"
        description="Pre-built graph queries over the business relationship network — pick a query to render its subgraph and result table."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Businesses" value={stats.total_businesses.toLocaleString()} />
        <StatCard label="Relationship edges" value={stats.total_edges.toLocaleString()} />
        <StatCard
          label="Exported nodes"
          value={stats.exported_nodes.toLocaleString()}
          detail="in the rendered graph"
        />
        <StatCard
          label="Exported links"
          value={stats.exported_links.toLocaleString()}
          detail="in the rendered graph"
        />
      </div>

      <GraphExplorer />
    </div>
  );
}
