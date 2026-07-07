import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCategoryLabel, searchBusinesses } from "@/lib/data";
import { PageHeader } from "@/components/terminal/ui";
import type { CorrectionBusiness } from "./fields";
import { CorrectionsClient } from "./corrections-client";

export const metadata: Metadata = { title: "Corrections — CO_ Network" };

// Corrections — available to every role. Port of the legacy CorrectionPage
// submit flow; review/approve moves to the provenance system at launch.
export default async function CorrectionsPage() {
  await getSession();

  const { items } = searchBusinesses({ perPage: 100000 });
  const businesses: CorrectionBusiness[] = items.map((b) => ({
    slug: b.slug,
    name: b.name,
    // Order must match CORRECTION_FIELDS in ./fields.ts
    values: [
      b.name,
      getCategoryLabel(b.category_slug),
      b.neighborhood_label ?? "",
      b.address ?? "",
      b.postcode ?? "",
      b.phone ?? "",
      b.website ?? "",
      b.price_tier ?? "",
      b.rating != null ? b.rating.toFixed(1) : "",
      b.review_count != null ? String(b.review_count) : "",
      b.status,
    ],
  }));

  return (
    <div>
      <PageHeader
        section="Tools"
        title="Corrections"
        description="Spot something wrong in a business record? Propose a fix. Submissions are stored locally until accounts launch, then corrections flow into the provenance system for review."
      />
      <CorrectionsClient businesses={businesses} />
    </div>
  );
}
