import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getInternal } from "@/lib/terminal/internal";
import { getCategoryLabel, searchBusinesses } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/terminal/ui";
import { ResolveTable, type ResolveRow } from "./table";

export const metadata: Metadata = { title: "Resolve — CO_ Network" };

// Membership resolution — the tri-state gap. chamber_member is true (verified
// member), false (confirmed non-member), or null (unknown). This tab exists
// for the nulls only; false is a real answer and never appears here.
export default async function ResolvePage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_member_status")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const rows: ResolveRow[] = searchBusinesses({ perPage: 100000 })
    .items.filter((b) => b.chamber_member === null)
    .map((b) => {
      const i = getInternal(b.id);
      const confidence = i?.osint_confidence != null ? Number(i.osint_confidence) : null;
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        category: getCategoryLabel(b.category_slug),
        neighborhood: b.neighborhood_label,
        rating: b.rating,
        confidence: confidence != null && Number.isFinite(confidence) ? confidence : null,
      };
    });

  return (
    <div className="space-y-8">
      <PageHeader
        section="Actions"
        title="Resolve membership"
        description={`${rows.length.toLocaleString()} businesses have unknown membership status — neither verified members nor confirmed non-members. Work them down here.`}
      />
      <ResolveTable rows={rows} />
    </div>
  );
}
