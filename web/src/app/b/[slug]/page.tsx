import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BusinessList, ChamberChip, Rating } from "@/components/business-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  getBenchmark,
  getBusinessBySlug,
  getCategoryLabel,
  getNearby,
  getSimilar,
} from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = getBusinessBySlug(slug);
  if (!b) return { title: "Business not found — CO_ Network" };
  const cat = getCategoryLabel(b.category_slug);
  return {
    title: `${b.name} — ${cat} in Coral Gables | CO_ Network`,
    description: `${b.name} is a ${cat.toLowerCase()} business in ${
      b.neighborhood_label ?? "Coral Gables"
    }. See its profile, local connections, and how it stands in the Coral Gables market — or claim it if it's yours.`,
  };
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const business = getBusinessBySlug(slug);
  if (!business) notFound();

  const benchmark = getBenchmark(business);
  const nearby = getNearby(business);
  const similar = getSimilar(business);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-10">
        <Link
          href="/directory"
          className="rounded-links text-label font-medium text-graphite transition-colors duration-200 hover:text-obsidian"
        >
          ← Directory
        </Link>

        {/* ── Identity + claim — 2-column editorial ── */}
        <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-medium tracking-[-1.2px] text-obsidian sm:text-display">
                {business.name}
              </h1>
            </div>
            <p className="mt-3 text-label font-medium text-graphite">
              {getCategoryLabel(business.category_slug)}
              {business.category_secondary && <> · {business.category_secondary}</>}
              {business.price_tier && !business.price_tier_inferred && (
                <> · {business.price_tier}</>
              )}
              {business.chamber_member === true && (
                <span className="ml-3 inline-block align-middle">
                  <ChamberChip />
                </span>
              )}
            </p>
            <div className="mt-4">
              <Rating rating={business.rating} count={business.review_count} />
            </div>

            <dl className="mt-8 max-w-md space-y-3 border-t border-hairline pt-6 text-body">
              {business.address && (
                <div className="flex gap-6">
                  <dt className="w-20 shrink-0 text-label font-medium text-graphite">Address</dt>
                  <dd className="font-normal text-obsidian">
                    {business.address}
                    {business.neighborhood_label && (
                      <span className="text-graphite"> · {business.neighborhood_label}</span>
                    )}
                  </dd>
                </div>
              )}
              {business.phone && (
                <div className="flex gap-6">
                  <dt className="w-20 shrink-0 text-label font-medium text-graphite">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${business.phone}`}
                      className="rounded-links font-normal text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
                    >
                      {business.phone}
                    </a>
                  </dd>
                </div>
              )}
              {business.website && (
                <div className="flex gap-6">
                  <dt className="w-20 shrink-0 text-label font-medium text-graphite">Website</dt>
                  <dd className="min-w-0">
                    <a
                      href={
                        business.website.startsWith("http")
                          ? business.website
                          : `https://${business.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate rounded-links font-normal text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
                    >
                      {business.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Claim card — carries the page's single filled button */}
          <aside className="h-fit rounded-cards border border-hairline p-6">
            <h2 className="text-subheading font-medium text-obsidian">Is this your business?</h2>
            <p className="mt-3 text-label font-normal leading-relaxed text-graphite">
              Claim this profile to see everything we know about it, correct anything that’s out
              of date, and unlock your full market benchmark and connection suggestions — free.
            </p>
            <Link
              href={`/claim/${business.slug}`}
              className="mt-5 block rounded-full bg-obsidian px-5 py-2.5 text-center text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
            >
              Claim this business
            </Link>
            <p className="mt-4 text-caption font-normal text-smoke">
              Ownership is verified with a one-time code sent to the phone number already on file.
            </p>
          </aside>
        </div>

        {/* ── Market position ── */}
        <section className="mt-20">
          <p className="text-label font-medium text-graphite">Market position</p>
          <div className="mt-6 grid grid-cols-1 gap-x-16 gap-y-8 sm:grid-cols-3">
            <div>
              <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
                {benchmark.ratedPeers}
              </p>
              <p className="mt-1 text-label font-normal text-graphite">
                rated {benchmark.categoryLabel.toLowerCase()} businesses in Coral Gables
              </p>
            </div>
            <div>
              <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
                {benchmark.ratingPercentile != null
                  ? `Top ${Math.max(1, 100 - benchmark.ratingPercentile)}%`
                  : "—"}
              </p>
              <p className="mt-1 text-label font-normal text-graphite">
                {benchmark.ratingPercentile != null
                  ? `meets or beats ${benchmark.ratingPercentile}% of rated peers`
                  : "not enough data yet"}
              </p>
            </div>
            <div>
              <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
                {benchmark.categoryAvgRating != null
                  ? benchmark.categoryAvgRating.toFixed(1)
                  : "—"}
              </p>
              <p className="mt-1 text-label font-normal text-graphite">average peer rating</p>
            </div>
          </div>

          {benchmark.opportunities.length > 0 && (
            <div className="mt-12 max-w-2xl">
              <h3 className="text-subheading font-medium text-obsidian">Headroom</h3>
              <ul className="mt-4 divide-y divide-hairline">
                {benchmark.opportunities.map((o) => (
                  <li key={o.title} className="py-4">
                    <p className="text-body font-medium text-obsidian">{o.title}</p>
                    <p className="mt-1 text-label font-normal leading-relaxed text-graphite">
                      {o.detail}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-caption font-normal text-smoke">
                Full benchmark detail is available to the verified owner of this profile.
              </p>
            </div>
          )}
        </section>

        {/* ── Connections ── */}
        {nearby.length > 0 && (
          <section className="mt-20">
            <p className="text-label font-medium text-graphite">Neighbors</p>
            <h2 className="mt-1 text-heading font-semibold text-obsidian">
              Within a two-minute walk
            </h2>
            <div className="mt-4 max-w-3xl border-t border-hairline">
              <BusinessList
                items={nearby.map((c) => c.business)}
                notes={nearby.map((c) => c.reason)}
              />
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-20">
            <p className="text-label font-medium text-graphite">Similar businesses</p>
            <h2 className="mt-1 text-heading font-semibold text-obsidian">
              Other {benchmark.categoryLabel.toLowerCase()} businesses nearby
            </h2>
            <div className="mt-4 max-w-3xl border-t border-hairline">
              <BusinessList
                items={similar.map((c) => c.business)}
                notes={similar.map((c) => c.reason)}
              />
            </div>
          </section>
        )}

        {/* ── Provenance disclosure ── */}
        <section className="mt-20 max-w-2xl border-t border-hairline pt-6">
          <p className="text-caption font-normal leading-relaxed text-graphite">
            This profile was assembled from public sources — maps data, public records, and the
            Coral Gables business ecosystem. Something out of date?{" "}
            <Link
              href={`/claim/${business.slug}`}
              className="rounded-links font-medium text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
            >
              Claim this profile
            </Link>{" "}
            to correct it — owner corrections take priority over every other source.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
