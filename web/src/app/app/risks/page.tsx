import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getRedFlagged } from "@/lib/terminal/internal";
import { getCategoryLabel, searchBusinesses, type Business } from "@/lib/data";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pill,
  StatCard,
} from "@/components/terminal/ui";

export const metadata: Metadata = { title: "Risks — CO_ Network" };

const MAX_ROWS = 150;

// Risk radar over the internal snapshot. Severity is read straight from the
// red_flag_severity column — it is authoritative. (The legacy page re-derived
// severity by regexing note text; we deliberately don't.)
export default async function RisksPage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_risk_flags")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const all = searchBusinesses({ perPage: 100000 }).items;
  const byId = new Map(all.map((b) => [b.id, b]));

  const flagged = getRedFlagged()
    .flatMap((r) => {
      const business = byId.get(r.id);
      if (!business) return [];
      const critical = r.red_flag_severity === "Critical";
      const notes = (r.red_flag_notes ?? "")
        .split(";")
        .map((n) => n.trim())
        .filter(Boolean);
      return [{ business, critical, notes }];
    })
    // Criticals first, then by note count.
    .sort(
      (a, b) =>
        Number(b.critical) - Number(a.critical) ||
        b.notes.length - a.notes.length ||
        a.business.name.localeCompare(b.business.name)
    );

  const criticalCount = flagged.filter((f) => f.critical).length;
  const pctOfDirectory =
    all.length > 0 ? ((flagged.length / all.length) * 100).toFixed(1) : "0.0";

  const shown = flagged.slice(0, MAX_ROWS);

  return (
    <div className="space-y-8">
      <PageHeader
        section="Actions"
        title="Risk radar"
        description="Businesses with active red flags in the internal snapshot, most severe first."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Flagged businesses" value={flagged.length.toLocaleString()} />
        <StatCard
          label="Critical"
          value={criticalCount.toLocaleString()}
          accent="var(--color-coral-red)"
          detail={`${(flagged.length - criticalCount).toLocaleString()} operational`}
        />
        <StatCard
          label="Share of directory"
          value={`${pctOfDirectory}%`}
          detail={`of ${all.length.toLocaleString()} businesses`}
        />
      </div>

      <Card padded={false}>
        <div className="divide-y divide-graphite">
          {shown.map(({ business, critical, notes }) => (
            <RiskRow
              key={business.id}
              business={business}
              critical={critical}
              notes={notes}
            />
          ))}
          {shown.length === 0 && (
            <p className="px-6 py-10 text-center text-caption text-fog">
              No red-flagged businesses in the current snapshot.
            </p>
          )}
        </div>
        {flagged.length > MAX_ROWS && (
          <p className="border-t border-graphite px-6 py-3 text-center text-caption text-fog">
            Showing the {MAX_ROWS} most severe of {flagged.length.toLocaleString()} flagged
            businesses.
          </p>
        )}
      </Card>
    </div>
  );
}

function RiskRow({
  business,
  critical,
  notes,
}: {
  business: Business;
  critical: boolean;
  notes: string[];
}) {
  return (
    <div className="px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/b/${business.slug}`}
          className="text-body-sm font-w510 text-mist transition-colors duration-150 hover:text-paper"
        >
          {business.name}
        </Link>
        <Badge color={critical ? "var(--color-coral-red)" : "var(--color-lavender)"}>
          {critical ? "critical" : "operational"}
        </Badge>
      </div>
      <p className="mt-0.5 text-caption text-fog">
        {getCategoryLabel(business.category_slug)}
        {business.neighborhood_label && <> · {business.neighborhood_label}</>}
      </p>
      {notes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {notes.map((note) => (
            <Pill key={note}>{note}</Pill>
          ))}
        </div>
      )}
    </div>
  );
}
