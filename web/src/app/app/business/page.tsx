import type { Metadata } from "next";
import { getSessionBusiness } from "@/lib/session";
import { getCategoryLabel } from "@/lib/data";

export const metadata: Metadata = { title: "Profile & data — CO_ Network" };

// The "what we know about you and where it came from" view — the trust
// mechanism (REBUILD-PLAN D10). In preview, sources are shown at the
// source-family level; per-field provenance detail and the correction queue
// are owner-scoped and unlock with verified accounts (RLS, D5).
export default async function BusinessDataPage() {
  const business = await getSessionBusiness();

  const rows: { field: string; value: string | null; source: string }[] = [
    { field: "Name", value: business.name, source: "Public records" },
    {
      field: "Category",
      value:
        getCategoryLabel(business.category_slug) +
        (business.category_secondary ? ` · ${business.category_secondary}` : ""),
      source: "Maps data",
    },
    { field: "Address", value: business.address, source: "Maps data" },
    { field: "Neighborhood", value: business.neighborhood_label, source: "Derived from address" },
    { field: "Phone", value: business.phone, source: "Maps data" },
    { field: "Website", value: business.website, source: "Maps data" },
    {
      field: "Price tier",
      value: business.price_tier,
      source: business.price_tier_inferred ? "Estimated — needs owner confirmation" : "Maps data",
    },
    {
      field: "Rating",
      value:
        business.rating != null
          ? business.rating.toFixed(1) +
            (business.review_count != null ? ` (${business.review_count} reviews)` : "")
          : null,
      source: "Maps data",
    },
    {
      field: "Chamber membership",
      value:
        business.chamber_member === true
          ? "Member"
          : business.chamber_member === false
            ? "Not a member"
            : "Unknown",
      source: "Chamber of Commerce directory",
    },
  ];

  return (
    <div>
      <p className="text-label font-medium text-graphite">Profile &amp; data</p>
      <h1 className="mt-1 text-heading font-semibold text-obsidian">
        What the network knows about you
      </h1>
      <p className="mt-2 max-w-xl text-body font-normal text-graphite">
        Every field below was gathered from public sources. Once verified, your corrections take
        priority over every other source — permanently.
      </p>

      <div className="mt-8 max-w-3xl border-t border-hairline">
        <ul className="divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.field} className="flex items-baseline gap-6 py-4">
              <span className="w-40 shrink-0 text-label font-medium text-graphite">{r.field}</span>
              <span className="min-w-0 flex-1">
                {r.value ? (
                  <span className="text-body font-normal text-obsidian">{r.value}</span>
                ) : (
                  <span className="text-body font-normal text-smoke">Not on file</span>
                )}
                <span className="mt-0.5 block text-caption font-normal text-smoke">
                  Source: {r.source}
                </span>
              </span>
              <span
                className="shrink-0 cursor-default rounded-full border border-hairline px-4 py-1 text-caption font-medium text-smoke"
                title="Corrections open with verified accounts"
              >
                Correct
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 max-w-xl text-caption font-normal leading-relaxed text-smoke">
        Corrections are disabled in preview. With a verified account, low-risk fields (phone,
        website, hours) apply immediately; identity fields (name, category) go through a short
        review.
      </p>
    </div>
  );
}
