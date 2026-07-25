import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getInternal } from "@/lib/terminal/internal";
import {
  computeRecruitabilityScore,
  getRecruitabilityBand,
  getRecruitReasons,
} from "@/lib/terminal/scoring";
import { getCategoryLabel, searchBusinesses } from "@/lib/data";
import { EmptyState, PageHeader, StatCard } from "@/components/terminal/ui";
import { RecruitTable, type RecruitRow } from "./table";

export const metadata: Metadata = { title: "Recruit — CO_ Network" };

// Recruit queue — every business that is not a verified member
// (chamber_member !== true, i.e. confirmed non-members AND unknowns),
// scored by the legacy recruitability engine and ranked descending.
export default async function RecruitPage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_recruit_queue")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const all = searchBusinesses({ perPage: 100000 }).items;

  const rows: RecruitRow[] = all
    .filter((b) => b.chamber_member !== true)
    .map((b) => {
      const internal = getInternal(b.id);
      const score = computeRecruitabilityScore(b, internal);
      const band = getRecruitabilityBand(score);
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        category: getCategoryLabel(b.category_slug),
        neighborhood: b.neighborhood_label,
        rating: b.rating,
        score,
        band: band.band,
        bandLabel: band.label,
        bandColor: band.color,
        reasons: getRecruitReasons(b, internal),
        membershipUnknown: b.chamber_member === null,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  // Band KPI counts — computed on band.band (the letter), fixing the legacy
  // bug where RecruitQueuePage compared against band.label and every band
  // card permanently showed 0.
  const bandCounts: Record<RecruitRow["band"], number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of rows) bandCounts[r.band] += 1;

  // Band colors come from the scoring engine, not re-declared here.
  const bandA = getRecruitabilityBand(80);
  const bandB = getRecruitabilityBand(60);
  const bandC = getRecruitabilityBand(40);
  const bandD = getRecruitabilityBand(10);

  const unknownCount = rows.filter((r) => r.membershipUnknown).length;

  return (
    <div className="space-y-8">
      <PageHeader
        section="Actions"
        title="Recruit queue"
        description={`${rows.length.toLocaleString()} prospects ranked by recruitability. Includes ${unknownCount.toLocaleString()} unknown-membership businesses — flagged per row, resolvable in the Resolve tab.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total prospects" value={rows.length.toLocaleString()} />
        <StatCard
          label={`Band A — ${bandA.label}`}
          value={bandCounts.A.toLocaleString()}
          accent={bandA.color}
          detail="score 75+"
        />
        <StatCard
          label={`Band B — ${bandB.label}`}
          value={bandCounts.B.toLocaleString()}
          accent={bandB.color}
          detail="score 55–74"
        />
        <StatCard
          label={`Band C — ${bandC.label}`}
          value={bandCounts.C.toLocaleString()}
          accent={bandC.color}
          detail="score 35–54"
        />
        <StatCard
          label={`Band D — ${bandD.label}`}
          value={bandCounts.D.toLocaleString()}
          detail="score below 35"
        />
      </div>

      <RecruitTable rows={rows} />
    </div>
  );
}
