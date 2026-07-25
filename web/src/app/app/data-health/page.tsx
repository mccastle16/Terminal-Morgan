import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { searchBusinesses } from "@/lib/data";
import { getInternalAll } from "@/lib/terminal/internal";
import {
  Card,
  MonoTag,
  PageHeader,
  SectionLabel,
  StatCard,
} from "@/components/terminal/ui";

export const metadata: Metadata = { title: "Data Health — CO_ Network" };

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-36 shrink-0 truncate text-caption text-fog">{label}</span>
      <span className="h-1.5 flex-1 rounded-pills bg-white/[0.06]">
        <span
          className="block h-1.5 rounded-pills bg-mist"
          style={{ width: `${Math.max(0.5, Math.min(100, pct))}%` }}
          aria-hidden
        />
      </span>
      <span className="w-28 shrink-0 text-right">
        <MonoTag>
          {count.toLocaleString("en-US")} · {pct.toFixed(1)}%
        </MonoTag>
      </span>
    </div>
  );
}

// Data Health — gated on manage_data. Port of the legacy DataRefreshPage
// monitor, honestly: coverage and staleness are computed from the snapshot,
// and there is no fake refresh button — refresh runs in the Python pipeline.
export default async function DataHealthPage() {
  const session = await getSession();
  if (!hasPermission(session.role, "manage_data")) {
    return (
      <div>
        <PageHeader section="Tools" title="Data Health" />
        <Card className="mt-8">
          <p className="text-body-sm font-w510 text-mist">
            Data Health is not available for the {session.role} role.
          </p>
          <p className="mt-1 text-caption text-fog">
            It requires the manage_data permission (admin).
          </p>
        </Card>
      </div>
    );
  }

  const { items: businesses } = searchBusinesses({ perPage: 100000 });
  const internal = getInternalAll();
  const total = businesses.length;

  // Field coverage
  const coverage = [
    { label: "Phone", count: businesses.filter((b) => b.phone).length },
    { label: "Website", count: businesses.filter((b) => b.website).length },
    {
      label: "Geo (exact)",
      count: businesses.filter((b) => b.location_precision === "exact").length,
    },
    { label: "Rating", count: businesses.filter((b) => b.rating != null).length },
    { label: "Address", count: businesses.filter((b) => b.address != null).length },
  ];
  const quality =
    coverage.slice(0, 4).reduce((s, c) => s + (c.count / total) * 100, 0) / 4;

  // Validation tiers + source files from internal records
  const tierCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  let latestReview: string | null = null;
  for (const r of internal) {
    const tier = r.validation_tier ?? "Unrecorded";
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
    const src = r.source_file ?? "unknown";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    if (r.last_reviewed_date && (!latestReview || r.last_reviewed_date > latestReview)) {
      latestReview = r.last_reviewed_date;
    }
  }
  const tierOrder = ["High", "Moderate", "Low", "Unrecorded"];
  const tiers = tierOrder
    .filter((t) => tierCounts.has(t))
    .map((t) => ({ label: t, count: tierCounts.get(t) ?? 0 }));
  const sources = [...sourceCounts.entries()].sort((a, z) => z[1] - a[1]);

  const staleDays = latestReview
    ? Math.floor((Date.now() - new Date(latestReview + "T00:00:00Z").getTime()) / 86400000)
    : null;
  const highShare = ((tierCounts.get("High") ?? 0) / internal.length) * 100;

  return (
    <div>
      <PageHeader
        section="Tools"
        title="Data Health"
        description="Coverage, validation, and freshness of the current snapshot — computed, not estimated."
      />

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Records" value={total.toLocaleString("en-US")} />
        <StatCard
          label="Quality score"
          value={`${quality.toFixed(0)}%`}
          detail="Mean of phone, website, exact-geo, and rating coverage"
        />
        <StatCard
          label="Staleness"
          value={staleDays != null ? `${staleDays}d` : "—"}
          detail={
            latestReview
              ? `Since the newest last-reviewed date (${latestReview})`
              : "No review dates recorded"
          }
        />
        <StatCard
          label="High validation"
          value={`${highShare.toFixed(0)}%`}
          detail="Records confirmed by 3+ sources"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionLabel>Field coverage</SectionLabel>
          <div className="mt-3">
            {coverage.map((c) => (
              <BarRow key={c.label} label={c.label} count={c.count} total={total} />
            ))}
          </div>
          <p className="mt-3 text-label text-ash">
            Geo counts exact per-business geocodes only — approximate centroid points are
            excluded, since hundreds of records can share one.
          </p>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionLabel>Validation tiers</SectionLabel>
            <div className="mt-3">
              {tiers.map((t) => (
                <BarRow key={t.label} label={t.label} count={t.count} total={internal.length} />
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>Source files</SectionLabel>
            <div className="mt-3">
              {sources.map(([src, count]) => (
                <BarRow key={src} label={src} count={count} total={internal.length} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <p className="text-caption text-mist">
          Refresh runs in the Python pipeline, not here.
        </p>
        <p className="mt-1 text-caption text-fog">
          The snapshot is regenerated by the offline scripts (scrape, corroborate, validate,
          emit) and committed with the app. This page reads whatever snapshot is currently
          deployed — there is no in-app refresh to press.
        </p>
      </Card>
    </div>
  );
}
