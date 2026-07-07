import Link from "next/link";
import type { Metadata } from "next";
import { getSessionBusiness } from "@/lib/session";
import { getBenchmark, getCategoryLabel, getNearby, getSimilar } from "@/lib/data";

export const metadata: Metadata = { title: "Overview — CO_ Network" };

// Owner-dashboard overview: where the business stands and what to do next.
export default async function AppOverviewPage() {
  const business = await getSessionBusiness();
  const benchmark = getBenchmark(business);
  const nearby = getNearby(business);
  const similar = getSimilar(business);

  const profileFields = [
    business.phone,
    business.website,
    business.address,
    business.rating,
    business.price_tier,
    business.neighborhood_label,
  ];
  const completeness = Math.round(
    (profileFields.filter((f) => f != null).length / profileFields.length) * 100
  );

  return (
    <div>
      <p className="text-label font-medium text-graphite">Overview</p>
      <h1 className="mt-1 text-heading font-semibold text-obsidian">{business.name}</h1>
      <p className="mt-1 text-label font-normal text-graphite">
        {getCategoryLabel(business.category_slug)}
        {business.neighborhood_label && <> · {business.neighborhood_label}</>}
      </p>

      {/* Standing at a glance */}
      <div className="mt-10 grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-4">
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {business.rating != null ? business.rating.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">
            rating{business.review_count != null && <> · {business.review_count} reviews</>}
          </p>
        </div>
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {benchmark.ratingPercentile != null
              ? `Top ${Math.max(1, 100 - benchmark.ratingPercentile)}%`
              : "—"}
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">
            of {benchmark.ratedPeers} rated {benchmark.categoryLabel.toLowerCase()} peers
          </p>
        </div>
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {nearby.length + similar.length}
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">suggested connections</p>
        </div>
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {completeness}%
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">profile completeness</p>
        </div>
      </div>

      {/* What to do next */}
      <section className="mt-14 max-w-2xl">
        <h2 className="text-subheading font-medium text-obsidian">What to do next</h2>
        <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
          {benchmark.opportunities.length > 0 ? (
            benchmark.opportunities.map((o) => (
              <li key={o.title} className="py-4">
                <p className="text-body font-medium text-obsidian">{o.title}</p>
                <p className="mt-1 text-label font-normal leading-relaxed text-graphite">
                  {o.detail}
                </p>
              </li>
            ))
          ) : (
            <li className="py-4">
              <p className="text-body font-medium text-obsidian">
                Your profile fundamentals are in place.
              </p>
              <p className="mt-1 text-label font-normal text-graphite">
                Review your data for accuracy and confirm your first connections.
              </p>
            </li>
          )}
          <li className="py-4">
            <p className="text-body font-medium text-obsidian">
              Review {nearby.length + similar.length} suggested connections
            </p>
            <p className="mt-1 text-label font-normal text-graphite">
              Confirm the ones that matter — confirmed connections appear on your public page.{" "}
              <Link
                href="/app/connections"
                className="rounded-links font-medium text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
              >
                See connections
              </Link>
            </p>
          </li>
        </ul>
      </section>
    </div>
  );
}
