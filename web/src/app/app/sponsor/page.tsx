import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getCategoryLabel, getStats, searchBusinesses } from "@/lib/data";
import {
  PageHeader,
  Card,
  StatCard,
  SectionLabel,
  EmptyState,
  MonoTag,
  ghostBtnCls,
} from "@/components/terminal/ui";

export const metadata: Metadata = { title: "Sponsor Intel — CO_ Network" };

// Sponsor Intel is aggregate-only: audience composition for sponsors and
// partners. No individual business data is surfaced here.

function catLabel(slug: string): string {
  const l = getCategoryLabel(slug);
  return l === slug ? slug.replace(/_/g, " ") : l;
}

export default async function SponsorPage() {
  const session = await getSession();
  if (!hasPermission(session.role, "view_sponsorship")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const stats = getStats();
  const all = searchBusinesses({ perPage: 100000 }).items;
  const members = all.filter((b) => b.chamber_member === true);

  const ratedMembers = members.filter((b) => b.rating != null);
  const avgMemberRating =
    ratedMembers.length > 0
      ? ratedMembers.reduce((s, b) => s + (b.rating as number), 0) / ratedMembers.length
      : null;
  const websiteRate =
    members.length > 0
      ? Math.round((members.filter((b) => b.website != null).length / members.length) * 100)
      : 0;

  // Top categories by audience size, with member penetration.
  const catAgg = new Map<string, { total: number; members: number }>();
  for (const b of all) {
    const e = catAgg.get(b.category_slug) ?? { total: 0, members: 0 };
    e.total += 1;
    if (b.chamber_member === true) e.members += 1;
    catAgg.set(b.category_slug, e);
  }
  const topCategories = [...catAgg.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([slug, v]) => ({
      label: catLabel(slug),
      total: v.total,
      penetration: v.total > 0 ? Math.round((v.members / v.total) * 100) : 0,
    }));
  const maxCat = Math.max(...topCategories.map((c) => c.total), 1);

  // Top neighborhoods by audience size, with member penetration.
  const hoodAgg = new Map<string, { total: number; members: number }>();
  for (const b of all) {
    if (!b.neighborhood_label) continue;
    const e = hoodAgg.get(b.neighborhood_label) ?? { total: 0, members: 0 };
    e.total += 1;
    if (b.chamber_member === true) e.members += 1;
    hoodAgg.set(b.neighborhood_label, e);
  }
  const topHoods = [...hoodAgg.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([label, v]) => ({
      label,
      total: v.total,
      penetration: v.total > 0 ? Math.round((v.members / v.total) * 100) : 0,
    }));
  const maxHood = Math.max(...topHoods.map((h) => h.total), 1);

  // Price tier mix.
  const tiers = ["$", "$$", "$$$", "$$$$"] as const;
  const tierMix = tiers.map((tier) => ({
    tier,
    count: all.filter((b) => b.price_tier === tier).length,
  }));
  const maxTier = Math.max(...tierMix.map((t) => t.count), 1);

  return (
    <div className="space-y-10">
      <PageHeader
        section="Insights"
        title="Sponsor Intel"
        description="Audience composition for sponsors and partners — who the network reaches, by category, geography, and price point."
        actions={
          <button type="button" className={ghostBtnCls()}>
            Request custom report
          </button>
        }
      />

      {/* Audience overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total audience"
          value={stats.total.toLocaleString()}
          detail="businesses in the ecosystem"
        />
        <StatCard
          label="Verified members"
          value={stats.members.toLocaleString()}
          detail={`${stats.total > 0 ? Math.round((stats.members / stats.total) * 100) : 0}% of directory`}
        />
        <StatCard
          label="Member avg rating"
          value={avgMemberRating != null ? avgMemberRating.toFixed(1) : "—"}
          detail={`across ${ratedMembers.length.toLocaleString()} rated members`}
        />
        <StatCard
          label="Website rate"
          value={`${websiteRate}%`}
          detail="of members reachable online"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Category distribution */}
        <Card>
          <SectionLabel>Category distribution</SectionLabel>
          <p className="mt-1 text-label text-ash">Top 8 by audience size · member penetration at right</p>
          <div className="mt-4 space-y-3">
            {topCategories.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <p className="w-32 shrink-0 truncate text-caption capitalize text-fog">{c.label}</p>
                <div className="h-1.5 flex-1 rounded-pills bg-white/5">
                  <div
                    className="h-full rounded-pills bg-iris-violet/80"
                    style={{ width: `${(c.total / maxCat) * 100}%` }}
                  />
                </div>
                <p className="w-12 shrink-0 text-right text-caption text-mist">
                  {c.total.toLocaleString()}
                </p>
                <p className="w-10 shrink-0 text-right text-label text-ash">{c.penetration}%</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Geographic reach */}
        <Card>
          <SectionLabel>Geographic reach</SectionLabel>
          <p className="mt-1 text-label text-ash">Top 6 neighborhoods · member penetration at right</p>
          <div className="mt-4 space-y-3">
            {topHoods.map((h) => (
              <div key={h.label} className="flex items-center gap-3">
                <p className="w-32 shrink-0 truncate text-caption text-fog">{h.label}</p>
                <div className="h-1.5 flex-1 rounded-pills bg-white/5">
                  <div
                    className="h-full rounded-pills bg-pulse-green/80"
                    style={{ width: `${(h.total / maxHood) * 100}%` }}
                  />
                </div>
                <p className="w-12 shrink-0 text-right text-caption text-mist">
                  {h.total.toLocaleString()}
                </p>
                <p className="w-10 shrink-0 text-right text-label text-ash">{h.penetration}%</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Price tier mix */}
      <Card>
        <SectionLabel>Price tier mix</SectionLabel>
        <p className="mt-1 text-label text-ash">
          Listed price tiers across the directory — where sponsor audiences spend
        </p>
        <div className="mt-4 space-y-3">
          {tierMix.map((t) => (
            <div key={t.tier} className="flex items-center gap-3">
              <div className="w-12 shrink-0">
                <MonoTag>{t.tier}</MonoTag>
              </div>
              <div className="h-1.5 flex-1 rounded-pills bg-white/5">
                <div
                  className="h-full rounded-pills bg-mist/70"
                  style={{ width: `${(t.count / maxTier) * 100}%` }}
                />
              </div>
              <p className="w-14 shrink-0 text-right text-caption text-mist">
                {t.count.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-caption text-ash">
        All figures on this page are aggregates across the directory. No individual business data
        is disclosed to sponsors — contact the chamber for a custom, consented audience report.
      </p>
    </div>
  );
}
