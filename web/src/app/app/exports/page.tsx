import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getCategoryLabel, getStats, searchBusinesses, type Business } from "@/lib/data";
import { getInternalAll } from "@/lib/terminal/internal";
import { computeRecruitabilityScore, getRecruitabilityBand } from "@/lib/terminal/scoring";
import { Card, PageHeader } from "@/components/terminal/ui";
import { ExportsClient, type ExportFile } from "./exports-client";

export const metadata: Metadata = { title: "Exports — CO_ Network" };

function memberCell(b: Business): string {
  if (b.chamber_member === true) return "member";
  if (b.chamber_member === false) return "non-member";
  return "unknown";
}

// Exports — gated on export_data. Port of the legacy ExportsPage presets,
// rebuilt honestly: tri-state membership columns, real review counts only,
// no simulated processing. Files are generated client-side from rows the
// server serializes here.
export default async function ExportsPage() {
  const session = await getSession();
  if (!hasPermission(session.role, "export_data")) {
    return (
      <div>
        <PageHeader section="Tools" title="Exports" />
        <Card className="mt-8">
          <p className="text-body-sm font-w510 text-mist">
            Exports are not available for the {session.role} role.
          </p>
          <p className="mt-1 text-caption text-fog">
            Data export requires the export_data permission (leadership, membership, or admin).
          </p>
        </Card>
      </div>
    );
  }

  const ts = new Date().toISOString().split("T")[0];
  const { items: businesses } = searchBusinesses({ perPage: 100000 });
  const stats = getStats();
  const internalById = new Map(getInternalAll().map((r) => [r.id, r]));

  // (a) Full directory — public-safe fields only
  const directory: ExportFile = {
    id: "directory",
    title: "Full directory",
    description:
      "Every business with its public-safe fields: category, neighborhood, rating, real review count, contact, and tri-state membership.",
    filename: `conet_directory_${ts}.csv`,
    kind: "csv",
    rowCount: businesses.length,
    header: [
      "name", "category", "neighborhood", "rating", "review_count",
      "phone", "website", "address", "membership",
    ],
    rows: businesses.map((b) => [
      b.name,
      getCategoryLabel(b.category_slug),
      b.neighborhood_label ?? "",
      b.rating != null ? b.rating.toFixed(1) : "",
      b.review_count != null ? String(b.review_count) : "",
      b.phone ?? "",
      b.website ?? "",
      b.address ?? "",
      memberCell(b),
    ]),
  };

  // (b) Membership report — penetration by category + neighborhood, tri-state
  const membershipRows: string[][] = [];
  const groupRows = (
    group: "category" | "neighborhood",
    key: (b: Business) => string | null
  ) => {
    const map = new Map<string, { total: number; members: number; non: number; unknown: number }>();
    for (const b of businesses) {
      const k = key(b);
      if (!k) continue;
      const g = map.get(k) ?? { total: 0, members: 0, non: 0, unknown: 0 };
      g.total += 1;
      if (b.chamber_member === true) g.members += 1;
      else if (b.chamber_member === false) g.non += 1;
      else g.unknown += 1;
      map.set(k, g);
    }
    return [...map.entries()]
      .sort((a, z) => z[1].total - a[1].total)
      .map(([name, g]) => [
        group,
        name,
        String(g.total),
        String(g.members),
        String(g.non),
        String(g.unknown),
        ((g.members / g.total) * 100).toFixed(1),
      ]);
  };
  membershipRows.push(...groupRows("category", (b) => getCategoryLabel(b.category_slug)));
  membershipRows.push(...groupRows("neighborhood", (b) => b.neighborhood_label));
  const membership: ExportFile = {
    id: "membership",
    title: "Membership report",
    description:
      "Verified members, confirmed non-members, and unknowns by category and neighborhood. Tri-state honest: unknown is a column, never assumed either way.",
    filename: `conet_membership_report_${ts}.csv`,
    kind: "csv",
    rowCount: membershipRows.length,
    header: [
      "group", "name", "total", "members", "non_members", "unknown",
      "verified_member_share_pct",
    ],
    rows: membershipRows,
  };

  // (c) Recruit pipeline — non-members + unknowns, scored server-side
  const recruitRows = businesses
    .filter((b) => b.chamber_member !== true)
    .map((b) => {
      const score = computeRecruitabilityScore(b, internalById.get(b.id));
      const band = getRecruitabilityBand(score);
      return { b, score, band };
    })
    .sort((a, z) => z.score - a.score)
    .map(({ b, score, band }) => [
      b.name,
      getCategoryLabel(b.category_slug),
      b.neighborhood_label ?? "",
      memberCell(b),
      b.rating != null ? b.rating.toFixed(1) : "",
      b.review_count != null ? String(b.review_count) : "",
      String(score),
      band.band,
      band.label,
      b.phone ?? "",
      b.website ?? "",
    ]);
  const recruit: ExportFile = {
    id: "recruit",
    title: "Recruit pipeline",
    description:
      "Non-members and unknowns ranked by recruitability score (the legacy weighted model) with band A–D. Unknown-status businesses are included but labeled honestly.",
    filename: `conet_recruit_pipeline_${ts}.csv`,
    kind: "csv",
    rowCount: recruitRows.length,
    header: [
      "name", "category", "neighborhood", "membership", "rating", "review_count",
      "score", "band", "band_label", "phone", "website",
    ],
    rows: recruitRows,
  };

  // (d) Board summary — plain-text KPIs
  const rated = businesses.filter((b) => b.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((s, b) => s + (b.rating as number), 0) / rated.length
      : null;
  const pct = (n: number) => ((n / businesses.length) * 100).toFixed(1);
  const nonMembers = businesses.filter((b) => b.chamber_member === false).length;
  const unknowns = businesses.filter((b) => b.chamber_member == null).length;
  const catCounts = new Map<string, number>();
  for (const b of businesses)
    catCounts.set(b.category_slug, (catCounts.get(b.category_slug) ?? 0) + 1);
  const topCats = [...catCounts.entries()].sort((a, z) => z[1] - a[1]).slice(0, 10);

  const boardLines = [
    "CO_ NETWORK — BOARD SUMMARY",
    `Generated: ${ts}`,
    "",
    "KEY METRICS",
    `Businesses tracked: ${stats.total}`,
    `Verified members: ${stats.members} (${pct(stats.members)}%)`,
    `Confirmed non-members: ${nonMembers} (${pct(nonMembers)}%)`,
    `Membership unknown: ${unknowns} (${pct(unknowns)}%) — tri-state, never assumed`,
    `Average rating: ${avgRating != null ? avgRating.toFixed(2) : "n/a"} across ${rated.length} rated businesses`,
    "",
    "COVERAGE",
    `Website: ${pct(businesses.filter((b) => b.website).length)}%`,
    `Phone: ${pct(businesses.filter((b) => b.phone).length)}%`,
    `Public rating: ${pct(rated.length)}%`,
    "",
    "TOP CATEGORIES BY COUNT",
    ...topCats.map(
      ([slug, count], i) => `${i + 1}. ${getCategoryLabel(slug)} — ${count} businesses`
    ),
    "",
    "Review counts are real counts only; inferred values were stripped at snapshot time.",
  ];
  const board: ExportFile = {
    id: "board",
    title: "Board summary",
    description:
      "Executive KPI briefing as plain text: totals, tri-state membership, average rating, and coverage.",
    filename: `conet_board_summary_${ts}.txt`,
    kind: "txt",
    rowCount: boardLines.length,
    text: boardLines.join("\n"),
  };

  return (
    <div>
      <PageHeader
        section="Tools"
        title="Exports"
        description="Generate real files from the current snapshot, in your browser. Nothing is uploaded; membership stays tri-state in every report."
      />
      <ExportsClient files={[directory, membership, recruit, board]} />
    </div>
  );
}
