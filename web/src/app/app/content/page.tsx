import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCategoryLabel } from "@/lib/data";
import { getInternal } from "@/lib/terminal/internal";
import { PageHeader } from "@/components/terminal/ui";
import { ContentClient } from "./content-client";

export const metadata: Metadata = { title: "Content — CO_ Network" };

// Content Studio — available to every role. Generates marketing copy for the
// session business from the legacy template engine (4 types × 4 tones),
// interpolating real snapshot facts (incl. the internal top delight).
export default async function ContentPage() {
  const session = await getSession();
  const b = session.business;
  const internal = getInternal(b.id);
  const topDelight = internal?.top_delights?.split(";")[0]?.trim() || null;

  return (
    <div>
      <PageHeader
        section="Tools"
        title="Content Studio"
        description={`Marketing copy for ${b.name}, built from what the snapshot actually knows — rating, category, neighborhood, and what reviewers praise.`}
      />
      <ContentClient
        business={{
          name: b.name,
          category: getCategoryLabel(b.category_slug),
          neighborhood: b.neighborhood_label,
          rating: b.rating,
          delight: topDelight,
        }}
      />
    </div>
  );
}
