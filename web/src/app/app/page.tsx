import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission, type Role } from "@/lib/terminal/roles";
import { getInternal, getRedFlagged } from "@/lib/terminal/internal";
import {
  computeRecruitabilityScore,
  getRecruitabilityBand,
} from "@/lib/terminal/scoring";
import {
  getBenchmark,
  getCategoryLabel,
  getNearby,
  getSimilar,
  getStats,
  searchBusinesses,
  type Business,
} from "@/lib/data";
import {
  Badge,
  Card,
  MonoTag,
  PageHeader,
  SectionLabel,
  StatCard,
} from "@/components/terminal/ui";
import { MembershipByCategoryChart, type CategorySplitRow } from "./charts";

export const metadata: Metadata = { title: "Overview — CO_ Network" };

// Overview — ported from the legacy dashboard OverviewPage over the new data
// layer. Staff roles get the market map (KPIs, category penetration, data
// quality, recruit prospects); member/nonmember roles get a business-centric
// overview of their own standing.
export default async function AppOverviewPage() {
  const { role, business } = await getSession();
  if (role === "member" || role === "nonmember") {
    return <BusinessOverview business={business} />;
  }
  return <MarketOverview role={role} />;
}

// ── Staff view — the market map ─────────────────────────────────────────────

function CoverageRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-caption text-mist">{label}</span>
        <span className="text-caption text-fog">{pct.toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-1 w-full rounded-pills bg-white/5">
        <div
          className="h-1 rounded-pills bg-mist"
          style={{ width: `${Math.min(100, Math.max(1, pct))}%` }}
        />
      </div>
    </div>
  );
}

function MarketOverview({ role }: { role: Role }) {
  const stats = getStats();
  const all = searchBusinesses({ perPage: Math.max(1, stats.total) }).items;

  const members = all.filter((b) => b.chamber_member === true).length;
  const nonMembers = all.filter((b) => b.chamber_member === false).length;
  const unknown = all.filter((b) => b.chamber_member === null).length;
  const penetration = stats.total > 0 ? (members / stats.total) * 100 : 0;
  const unknownShare = stats.total > 0 ? (unknown / stats.total) * 100 : 0;

  const canRisk = hasPermission(role, "view_risk_flags");
  const canAnalytics = hasPermission(role, "view_analytics");
  const canRecruit = hasPermission(role, "view_recruit_queue");
  const redFlags = canRisk ? getRedFlagged().length : 0;

  // Top-12 categories by size, split by membership status.
  const byCategory = new Map<
    string,
    { members: number; nonMembers: number; unknown: number; total: number }
  >();
  for (const b of all) {
    const s =
      byCategory.get(b.category_slug) ??
      { members: 0, nonMembers: 0, unknown: 0, total: 0 };
    if (b.chamber_member === true) s.members += 1;
    else if (b.chamber_member === false) s.nonMembers += 1;
    else s.unknown += 1;
    s.total += 1;
    byCategory.set(b.category_slug, s);
  }
  const topCategories: CategorySplitRow[] = [...byCategory.entries()]
    .sort((a, z) => z[1].total - a[1].total)
    .slice(0, 12)
    .map(([slug, s]) => ({
      name: getCategoryLabel(slug),
      members: s.members,
      nonMembers: s.nonMembers,
      unknown: s.unknown,
    }));

  // Data-quality coverage across the snapshot.
  const pct = (n: number) => (stats.total > 0 ? (n / stats.total) * 100 : 0);
  const coverage = [
    { label: "Phone", pct: pct(all.filter((b) => b.phone != null).length) },
    { label: "Website", pct: pct(all.filter((b) => b.website != null).length) },
    {
      label: "Coordinates",
      pct: pct(all.filter((b) => b.lat != null && b.lon != null).length),
    },
    { label: "Rating", pct: pct(all.filter((b) => b.rating != null).length) },
  ];

  // Top recruit prospects — highest recruitability among non-members/unknowns.
  const prospects = canRecruit
    ? all
        .filter((b) => b.chamber_member !== true)
        .map((b) => {
          const score = computeRecruitabilityScore(b, getInternal(b.id));
          return { business: b, score, band: getRecruitabilityBand(score) };
        })
        .sort((a, z) => z.score - a.score)
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        section="Core"
        title="Overview"
        description={`${stats.total.toLocaleString()} businesses · ${stats.categories} categories · ${stats.neighborhoods} neighborhoods`}
      />

      {/* KPI row — unknown is its own honest stat, never folded into non-members */}
      <div
        className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${canRisk ? "xl:grid-cols-5" : ""}`}
      >
        <StatCard label="Total businesses" value={stats.total.toLocaleString()} />
        <StatCard
          label="Chamber members"
          value={members.toLocaleString()}
          detail={`${penetration.toFixed(1)}% penetration`}
        />
        <StatCard
          label="Non-members"
          value={nonMembers.toLocaleString()}
          detail="confirmed not members"
        />
        <StatCard
          label="Unknown status"
          value={unknown.toLocaleString()}
          detail={`${unknownShare.toFixed(1)}% need classification`}
        />
        {canRisk && (
          <StatCard
            label="Risk flags"
            value={redFlags.toLocaleString()}
            detail="red-flagged in snapshot"
          />
        )}
      </div>

      {/* Membership by category + data quality */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {canAnalytics && (
          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionLabel>Membership by category</SectionLabel>
                <p className="mt-1 text-caption text-fog">Top 12 sectors</p>
              </div>
              <Link
                href="/app/analytics"
                className="shrink-0 cursor-pointer text-caption text-fog transition-colors duration-150 hover:text-mist"
              >
                View all →
              </Link>
            </div>
            <div className="mt-4">
              <MembershipByCategoryChart data={topCategories} />
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
        )}

        <Card className={canAnalytics ? "" : "lg:col-span-3"}>
          <SectionLabel>Data quality</SectionLabel>
          <p className="mt-1 text-caption text-fog">Field coverage across the snapshot</p>
          <div className="mt-5 space-y-4">
            {coverage.map((c) => (
              <CoverageRow key={c.label} label={c.label} pct={c.pct} />
            ))}
          </div>
          {unknown > 0 && (
            <p className="mt-6 border-t border-graphite pt-4 text-caption text-fog">
              {unknown.toLocaleString()} businesses have unknown membership status —{" "}
              {unknownShare.toFixed(1)}% of the market still needs classification.
            </p>
          )}
        </Card>
      </div>

      {/* Top recruit prospects */}
      {canRecruit && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionLabel>Top recruit prospects</SectionLabel>
              <p className="mt-1 text-caption text-fog">
                Highest-scored non-member and unknown businesses
              </p>
            </div>
            <Link
              href="/app/recruit"
              className="shrink-0 cursor-pointer text-caption text-fog transition-colors duration-150 hover:text-mist"
            >
              Full queue →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-graphite">
            {prospects.map((p, i) => (
              <li key={p.business.id} className="flex items-center gap-4 py-3">
                <span className="w-5 shrink-0 text-label text-ash">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/b/${p.business.slug}`}
                    className="cursor-pointer text-body-sm font-w510 text-paper transition-colors duration-150 hover:text-mist"
                  >
                    {p.business.name}
                  </Link>
                  <p className="truncate text-caption text-fog">
                    {getCategoryLabel(p.business.category_slug)}
                    {p.business.neighborhood_label && (
                      <> · {p.business.neighborhood_label}</>
                    )}
                  </p>
                </div>
                {p.business.rating != null && (
                  <span className="shrink-0 text-caption text-fog">
                    {p.business.rating.toFixed(1)} ★
                  </span>
                )}
                <Badge color={p.band.color}>
                  {p.band.band} · {p.band.label}
                </Badge>
                <MonoTag>{p.score}</MonoTag>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ── Member / non-member view — where the business stands ───────────────────

function BusinessOverview({ business }: { business: Business }) {
  const benchmark = getBenchmark(business);
  const nearby = getNearby(business);
  const similar = getSimilar(business);
  const connectionCount = nearby.length + similar.length;

  const profileFields = [
    business.phone,
    business.website,
    business.address,
    business.rating,
    business.price_tier,
    business.neighborhood_label,
  ];
  const completeness = Math.round(
    (profileFields.filter((f) => f != null).length / profileFields.length) * 100
  );

  return (
    <div className="space-y-8">
      <PageHeader
        section="Core"
        title="Overview"
        description={`${business.name} · ${getCategoryLabel(business.category_slug)}${business.neighborhood_label ? ` · ${business.neighborhood_label}` : ""}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Rating"
          value={business.rating != null ? business.rating.toFixed(1) : "—"}
          detail={
            business.review_count != null
              ? `${business.review_count} reviews`
              : "no public reviews yet"
          }
        />
        <StatCard
          label="Standing"
          value={
            benchmark.ratingPercentile != null
              ? `Top ${Math.max(1, 100 - benchmark.ratingPercentile)}%`
              : "—"
          }
          detail={`of ${benchmark.ratedPeers} rated ${benchmark.categoryLabel.toLowerCase()} peers`}
        />
        <StatCard
          label="Connections"
          value={connectionCount}
          detail="suggested from real signals"
        />
        <StatCard
          label="Completeness"
          value={`${completeness}%`}
          detail="profile fields on file"
        />
      </div>

      <Card>
        <SectionLabel>What to do next</SectionLabel>
        <ul className="mt-3 divide-y divide-graphite">
          {benchmark.opportunities.length > 0 ? (
            benchmark.opportunities.map((o) => (
              <li key={o.title} className="py-4">
                <p className="text-body-sm font-w510 text-paper">{o.title}</p>
                <p className="mt-1 text-caption text-fog">{o.detail}</p>
              </li>
            ))
          ) : (
            <li className="py-4">
              <p className="text-body-sm font-w510 text-paper">
                Your profile fundamentals are in place.
              </p>
              <p className="mt-1 text-caption text-fog">
                Review your data for accuracy and confirm your first connections.
              </p>
            </li>
          )}
          <li className="py-4">
            <p className="text-body-sm font-w510 text-paper">
              Review {connectionCount} suggested connections
            </p>
            <p className="mt-1 text-caption text-fog">
              Confirm the ones that matter — confirmed connections appear on your
              public page.{" "}
              <Link
                href="/app/my-business"
                className="cursor-pointer text-mist underline decoration-graphite underline-offset-4 transition-colors duration-150 hover:decoration-mist"
              >
                Open My Business
              </Link>
            </p>
          </li>
        </ul>
      </Card>
    </div>
  );
}
