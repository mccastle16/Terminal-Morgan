import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getCategoryLabel } from "@/lib/data";
import {
  PageHeader,
  Card,
  SubtleCard,
  StatCard,
  Badge,
  Pill,
  SectionLabel,
  EmptyState,
  MonoTag,
} from "@/components/terminal/ui";

export const metadata: Metadata = { title: "Opportunities — CO_ Network" };

// ── Shapes of public/ldata/opportunities.json ────────────────────────────────

type CategoryGap = {
  category: string;
  current_count: number;
  benchmark_per_1k: number;
  actual_per_1k: number;
  gap_per_1k: number;
  gap_businesses: number;
  gap_pct: number;
};

type Opportunity = {
  opportunity_id: string;
  business_concept: string;
  category: string;
  target_neighborhood: string;
  rationale: string;
  estimated_demand: string; // "high" | "medium" | "low"
  category_gap_pct: number;
  category_deficit: number;
};

type Desert = {
  neighborhood: string;
  total: number;
  missing: { category: string; count: number }[];
};

type OpportunitiesData = {
  generated: string;
  market_summary: {
    population: number;
    median_income: number;
    total_businesses: number;
    total_gap: number;
    gap_categories: number;
  };
  category_gaps: CategoryGap[];
  neighborhood_deserts: Desert[];
  opportunities: Opportunity[];
};

function catLabel(slug: string): string {
  const l = getCategoryLabel(slug);
  return l === slug ? slug.replace(/_/g, " ") : l;
}

const DEMAND_LABELS: Record<string, string> = {
  high: "High demand",
  medium: "Medium demand",
  low: "Low demand",
};

export default async function OpportunitiesPage() {
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
    path.join(process.cwd(), "public/ldata/opportunities.json"),
    "utf-8"
  );
  const data = JSON.parse(raw) as OpportunitiesData;
  const summary = data.market_summary;

  const gaps = [...data.category_gaps]
    .filter((g) => g.gap_businesses > 0)
    .sort((a, b) => b.gap_businesses - a.gap_businesses);
  const maxGapPct = Math.max(...gaps.map((g) => g.gap_pct), 1);

  const concepts = data.opportunities;
  const highDemand = concepts.filter((o) => o.estimated_demand === "high").length;

  return (
    <div className="space-y-10">
      <PageHeader
        section="Insights"
        title="Opportunities"
        description={`Business gaps in Coral Gables — ${summary.total_businesses.toLocaleString()} businesses measured against per-capita benchmarks.`}
        actions={<MonoTag>gen {data.generated.slice(0, 10)}</MonoTag>}
      />

      {/* Market summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Population"
          value={summary.population.toLocaleString()}
          detail={`$${Math.round(summary.median_income / 1000)}K median income`}
        />
        <StatCard
          label="Total market gap"
          value={`+${summary.total_gap.toLocaleString()}`}
          detail="businesses needed vs benchmark"
        />
        <StatCard
          label="Gap categories"
          value={summary.gap_categories}
          detail={`of ${data.category_gaps.length} tracked`}
        />
        <StatCard
          label="Curated concepts"
          value={concepts.length}
          detail={`${highDemand} high demand`}
        />
      </div>

      {/* Category gap table */}
      <section className="space-y-3">
        <SectionLabel>Category gap analysis</SectionLabel>
        <Card padded={false}>
          <div className="hidden grid-cols-[1.4fr_1fr_1.2fr_0.6fr_0.5fr] gap-4 border-b border-graphite px-6 py-3 md:grid">
            <p className="text-label text-ash">Category</p>
            <p className="text-label text-ash">Current vs benchmark / 1k</p>
            <p className="text-label text-ash">Gap</p>
            <p className="text-label text-ash text-right">Businesses</p>
            <p className="text-label text-ash text-right">Gap %</p>
          </div>
          <div className="divide-y divide-graphite">
            {gaps.map((g) => (
              <div
                key={g.category}
                className="grid grid-cols-2 gap-x-4 gap-y-2 px-6 py-3 md:grid-cols-[1.4fr_1fr_1.2fr_0.6fr_0.5fr] md:items-center"
              >
                <p className="text-body-sm text-mist capitalize">{catLabel(g.category)}</p>
                <p className="text-caption text-fog">
                  {g.actual_per_1k.toFixed(2)} <span className="text-ash">vs</span>{" "}
                  {g.benchmark_per_1k.toFixed(1)}
                </p>
                <div className="col-span-2 h-1.5 rounded-pills bg-white/5 md:col-span-1">
                  <div
                    className="h-full rounded-pills bg-coral-red/70"
                    style={{ width: `${Math.min(100, (g.gap_pct / maxGapPct) * 100)}%` }}
                  />
                </div>
                <p className="text-caption text-mist md:text-right">
                  +{g.gap_businesses.toLocaleString()}
                </p>
                <p className="text-caption text-fog md:text-right">{g.gap_pct.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </Card>
        <p className="text-caption text-ash">
          Gap = benchmark density minus current density, scaled to population. Bars are relative
          to the widest category gap.
        </p>
      </section>

      {/* Curated business concepts */}
      <section className="space-y-3">
        <SectionLabel>Curated concepts ({concepts.length})</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {concepts.map((o) => (
            <Card key={o.opportunity_id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-body-sm font-w510 text-paper">{o.business_concept}</p>
                <Pill className="shrink-0">{DEMAND_LABELS[o.estimated_demand] ?? o.estimated_demand}</Pill>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="capitalize">{catLabel(o.category)}</Badge>
                <Badge>{o.target_neighborhood}</Badge>
              </div>
              <p className="text-caption leading-relaxed text-fog">{o.rationale}</p>
              <p className="mt-auto text-label text-ash">
                {o.category_gap_pct}% underserved · +{o.category_deficit} needed in category
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Neighborhood deserts */}
      {data.neighborhood_deserts.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Neighborhood deserts</SectionLabel>
          <p className="text-caption text-fog">
            Areas with fewer than 3 businesses in essential categories.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.neighborhood_deserts.map((d) => (
              <SubtleCard key={d.neighborhood}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm font-w510 text-mist">{d.neighborhood}</p>
                  <p className="text-label text-ash">{d.total} businesses</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.missing.map((m) => (
                    <Badge key={m.category} className="capitalize">
                      {catLabel(m.category)} ({m.count})
                    </Badge>
                  ))}
                </div>
              </SubtleCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
