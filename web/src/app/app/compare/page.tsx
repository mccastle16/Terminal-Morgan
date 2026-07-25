import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getInternal } from "@/lib/terminal/internal";
import { getCategoryLabel, searchBusinesses } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/terminal/ui";
import { CompareTool, type CompareBiz } from "./compare";

export const metadata: Metadata = { title: "Compare — CO_ Network" };

export default async function ComparePage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_compare")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  // Serialize only the fields the comparer needs — never the full records.
  const businesses: CompareBiz[] = searchBusinesses({ perPage: 100000 }).items.map(
    (b) => {
      const i = getInternal(b.id);
      const confidence =
        i?.osint_confidence != null ? Number(i.osint_confidence) : null;
      const corroboration =
        i?.corroboration_count != null ? Number(i.corroboration_count) : null;
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        category: getCategoryLabel(b.category_slug),
        neighborhood: b.neighborhood_label,
        rating: b.rating,
        review_count: b.review_count,
        website: b.website,
        phone: b.phone,
        price_tier: b.price_tier,
        validation_tier: i?.validation_tier ?? null,
        osint_confidence:
          confidence != null && Number.isFinite(confidence) ? confidence : null,
        corroboration_count:
          corroboration != null && Number.isFinite(corroboration) ? corroboration : null,
        red_flag_present: i?.red_flag_present === "Y",
      };
    }
  );

  return (
    <div className="space-y-8">
      <PageHeader
        section="Actions"
        title="Compare"
        description="Side-by-side intelligence on any two businesses in the directory."
      />
      <CompareTool businesses={businesses} />
    </div>
  );
}
