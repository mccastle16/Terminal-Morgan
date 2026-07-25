import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getInternal, getInternalAll } from "@/lib/terminal/internal";
import { computeRecruitabilityScore } from "@/lib/terminal/scoring";
import { getCategoryLabel, getStats, searchBusinesses } from "@/lib/data";
import {
  Card,
  Divider,
  EmptyState,
  MonoTag,
  PageHeader,
  SectionLabel,
  StatCard,
} from "@/components/terminal/ui";
import {
  DonutChart,
  PenetrationChart,
  RatingBucketsChart,
  WhitespaceChart,
  type NamedValue,
  type PenetrationRow,
} from "./charts";

export const metadata: Metadata = { title: "Analytics — CO_ Network" };

// Series palette for the donut side-lists — must stay in step with the
// palette order inside ./charts.tsx.
const SERIES = ["#d0d6e0", "#6366f1", "#8b5cf6", "#02b8cc", "#27a644"];

function DonutList({ data }: { data: NamedValue[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="space-y-2">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 shrink-0 rounded-small"
            style={{ background: SERIES[i % SERIES.length] }}
          />
          <span className="min-w-0 flex-1 truncate text-caption text-mist">{d.name}</span>
          <span className="shrink-0 text-caption text-fog">
            {d.value.toLocaleString()}
            {total > 0 && <> · {((d.value / total) * 100).toFixed(1)}%</>}
          </span>
        </li>
      ))}
    </ul>
  );
}

type Split = { members: number; nonMembers: number; unknown: number; total: number };

function splitOf(map: Map<string, Split>, key: string): Split {
  const s = map.get(key) ?? { members: 0, nonMembers: 0, unknown: 0, total: 0 };
  map.set(key, s);
  return s;
}

// Analytics — legacy AnalyticsPage's two tabs, server-rendered as stacked
// sections: Market Overview, then Growth Opportunities.
export default async function AnalyticsPage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_analytics")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const stats = getStats();
  const all = searchBusinesses({ perPage: Math.max(1, stats.total) }).items;

  // ── Market overview ────────────────────────────────────────────────────
  const members = all.filter((b) => b.chamber_member === true).length;
  const nonMembers = all.filter((b) => b.chamber_member === false).length;
  const unknown = all.filter((b) => b.chamber_member === null).length;
  const membershipRate = stats.total > 0 ? (members / stats.total) * 100 : 0;
  const knownRate =
    stats.total > 0 ? ((members + nonMembers) / stats.total) * 100 : 0;

  const rated = all.filter((b) => b.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((s, b) => s + (b.rating as number), 0) / rated.length
      : 0;

  const membershipSplit: NamedValue[] = [
    { name: "Members", value: members },
    { name: "Non-members", value: nonMembers },
    { name: "Unknown", value: unknown },
  ];

  // Validation-tier distribution from the internal snapshot.
  const internal = getInternalAll();
  const tierCounts = new Map<string, number>();
  for (const r of internal) {
    const t = (r.validation_tier ?? "").toLowerCase();
    const label =
      t === "high" ? "High" : t === "moderate" ? "Moderate" : t === "low" ? "Low" : "Unverified";
    tierCounts.set(label, (tierCounts.get(label) ?? 0) + 1);
  }
  const validationSplit: NamedValue[] = ["High", "Moderate", "Low", "Unverified"]
    .filter((label) => (tierCounts.get(label) ?? 0) > 0)
    .map((label) => ({ name: label, value: tierCounts.get(label) ?? 0 }));
  const highValidationRate =
    internal.length > 0 ? ((tierCounts.get("High") ?? 0) / internal.length) * 100 : 0;

  // Rating buckets across all rated businesses.
  const buckets = [
    { name: "Below 2.5", min: 0, max: 2.5, count: 0 },
    { name: "2.5 – 3.4", min: 2.5, max: 3.5, count: 0 },
    { name: "3.5 – 3.9", min: 3.5, max: 4.0, count: 0 },
    { name: "4.0 – 4.4", min: 4.0, max: 4.5, count: 0 },
    { name: "4.5 – 5.0", min: 4.5, max: 5.01, count: 0 },
  ];
  for (const b of rated) {
    const bucket = buckets.find((x) => (b.rating as number) >= x.min && (b.rating as number) < x.max);
    if (bucket) bucket.count += 1;
  }
  const ratingBuckets = buckets.map(({ name, count }) => ({ name, count }));

  // Category + neighborhood penetration splits.
  const byCategory = new Map<string, Split>();
  const byNeighborhood = new Map<string, Split>();
  for (const b of all) {
    const c = splitOf(byCategory, b.category_slug);
    if (b.chamber_member === true) c.members += 1;
    else if (b.chamber_member === false) c.nonMembers += 1;
    else c.unknown += 1;
    c.total += 1;
    if (b.neighborhood_label) {
      const n = splitOf(byNeighborhood, b.neighborhood_label);
      if (b.chamber_member === true) n.members += 1;
      else if (b.chamber_member === false) n.nonMembers += 1;
      else n.unknown += 1;
      n.total += 1;
    }
  }

  const categoryPenetration: PenetrationRow[] = [...byCategory.entries()]
    .sort((a, z) => z[1].total - a[1].total)
    .slice(0, 15)
    .map(([slug, s]) => ({
      name: getCategoryLabel(slug),
      members: s.members,
      nonMembers: s.nonMembers,
      unknown: s.unknown,
    }));

  const neighborhoodPenetration: PenetrationRow[] = [...byNeighborhood.entries()]
    .sort((a, z) => z[1].total - a[1].total)
    .slice(0, 12)
    .map(([label, s]) => ({
      name: label,
      members: s.members,
      nonMembers: s.nonMembers,
      unknown: s.unknown,
    }));

  // ── Growth opportunities ───────────────────────────────────────────────
  const categoryWhitespace = [...byCategory.entries()]
    .map(([slug, s]) => ({
      name: getCategoryLabel(slug),
      value: s.nonMembers + s.unknown,
      total: s.total,
      penetration: s.total > 0 ? (s.members / s.total) * 100 : 0,
    }))
    .sort((a, z) => z.value - a.value);

  const neighborhoodWhitespace = [...byNeighborhood.entries()]
    .map(([label, s]) => ({
      name: label,
      opportunity: s.nonMembers + s.unknown,
      total: s.total,
      penetration: s.total > 0 ? (s.members / s.total) * 100 : 0,
    }))
    .sort((a, z) => z.opportunity - a.opportunity);

  // Recruit density — prospects (non-member + unknown) scored, by category.
  const prospects = all
    .filter((b) => b.chamber_member !== true)
    .map((b) => ({
      category: b.category_slug,
      score: computeRecruitabilityScore(b, getInternal(b.id)),
    }));
  const bandA = prospects.filter((p) => p.score >= 75).length;
  const densityMap = new Map<string, { count: number; totalScore: number }>();
  for (const p of prospects) {
    const d = densityMap.get(p.category) ?? { count: 0, totalScore: 0 };
    d.count += 1;
    d.totalScore += p.score;
    densityMap.set(p.category, d);
  }
  const recruitDensity = [...densityMap.entries()]
    .map(([slug, d]) => ({
      name: getCategoryLabel(slug),
      count: d.count,
      avgScore: Math.round(d.totalScore / d.count),
    }))
    .sort((a, z) => z.count - a.count)
    .slice(0, 12);

  const topOpportunity = categoryWhitespace[0];
  const lowPenetrationHoods = neighborhoodWhitespace.filter(
    (h) => h.penetration < 30
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        section="Core"
        title="Analytics"
        description="Penetration, quality, and growth intelligence"
      />

      {/* ── Market overview ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionLabel>Market overview</SectionLabel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Membership rate"
            value={`${membershipRate.toFixed(1)}%`}
            detail={`${members.toLocaleString()} of ${stats.total.toLocaleString()}`}
          />
          <StatCard
            label="Known status"
            value={`${knownRate.toFixed(1)}%`}
            detail={`${unknown.toLocaleString()} unknown`}
          />
          <StatCard
            label="Avg rating"
            value={avgRating.toFixed(2)}
            detail={`across ${rated.length.toLocaleString()} rated`}
          />
          <StatCard
            label="High validation"
            value={`${highValidationRate.toFixed(0)}%`}
            detail="high-tier validated records"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionLabel>Membership split</SectionLabel>
            <p className="mt-1 text-caption text-fog">Member vs non-member vs unknown</p>
            <div className="mt-2 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <DonutChart data={membershipSplit} />
              <DonutList data={membershipSplit} />
            </div>
          </Card>

          <Card>
            <SectionLabel>Validation tiers</SectionLabel>
            <p className="mt-1 text-caption text-fog">
              Data quality by corroboration level
            </p>
            <div className="mt-2 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <DonutChart data={validationSplit} />
              <DonutList data={validationSplit} />
            </div>
          </Card>
        </div>

        <Card>
          <SectionLabel>Rating distribution</SectionLabel>
          <p className="mt-1 text-caption text-fog">Rated businesses by public rating</p>
          <div className="mt-4">
            <RatingBucketsChart data={ratingBuckets} />
          </div>
        </Card>

        <Card>
          <SectionLabel>Category penetration</SectionLabel>
          <p className="mt-1 text-caption text-fog">
            Top 15 categories — members, non-members, unknown
          </p>
          <div className="mt-4">
            <PenetrationChart data={categoryPenetration} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-caption text-fog">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-small bg-mist" /> Members
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-small bg-iris-violet" /> Non-members
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-small bg-lavender" /> Unknown
            </span>
          </div>
        </Card>

        <Card>
          <SectionLabel>Neighborhood penetration</SectionLabel>
          <p className="mt-1 text-caption text-fog">Membership by neighborhood</p>
          <div className="mt-4">
            <PenetrationChart data={neighborhoodPenetration} />
          </div>
        </Card>
      </section>

      <Divider />

      {/* ── Growth opportunities ────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionLabel>Growth opportunities</SectionLabel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Recruit pipeline"
            value={prospects.length.toLocaleString()}
            detail={`${bandA.toLocaleString()} Band-A prospects`}
          />
          <StatCard
            label="Top opportunity"
            value={topOpportunity ? topOpportunity.name : "—"}
            detail={topOpportunity ? `${topOpportunity.value.toLocaleString()} untapped` : undefined}
          />
          <StatCard
            label="Low penetration"
            value={lowPenetrationHoods}
            detail="neighborhoods under 30%"
          />
          <StatCard
            label="Unknown status"
            value={unknown.toLocaleString()}
            detail="need classification"
          />
        </div>

        <Card>
          <SectionLabel>Category whitespace</SectionLabel>
          <p className="mt-1 text-caption text-fog">
            Biggest recruitment pools — non-members plus unknowns per category
          </p>
          <div className="mt-4">
            <WhitespaceChart
              data={categoryWhitespace
                .slice(0, 12)
                .map(({ name, value }) => ({ name, value }))}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionLabel>Neighborhood opportunity</SectionLabel>
            <p className="mt-1 text-caption text-fog">Sorted by untapped potential</p>
            <div className="mt-5 space-y-4">
              {neighborhoodWhitespace.map((h) => (
                <div key={h.name}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate text-caption text-mist">{h.name}</span>
                    <span className="shrink-0 text-caption text-fog">
                      {h.opportunity} untapped · {h.penetration.toFixed(0)}% penetration
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-pills bg-white/5">
                    <div
                      className="h-1 rounded-pills bg-mist"
                      style={{ width: `${Math.min(100, Math.max(1, h.penetration))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>Recruit density</SectionLabel>
            <p className="mt-1 text-caption text-fog">
              Categories with the most scored prospects
            </p>
            <table className="mt-4 w-full">
              <thead>
                <tr className="border-b border-graphite text-left">
                  <th className="pb-2 text-label font-w510 uppercase tracking-wide text-ash">
                    Category
                  </th>
                  <th className="pb-2 text-right text-label font-w510 uppercase tracking-wide text-ash">
                    Prospects
                  </th>
                  <th className="pb-2 text-right text-label font-w510 uppercase tracking-wide text-ash">
                    Avg score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite">
                {recruitDensity.map((r) => (
                  <tr key={r.name}>
                    <td className="py-2 text-caption text-mist">{r.name}</td>
                    <td className="py-2 text-right text-caption text-fog">{r.count}</td>
                    <td className="py-2 text-right">
                      <MonoTag>{r.avgScore}</MonoTag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>
    </div>
  );
}
