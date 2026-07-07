import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BadgeCheck,
  Globe,
  Lightbulb,
  MapPin,
  Phone,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { BusinessCard, Rating } from "@/components/business-card";
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/directory"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={14} aria-hidden /> Directory
        </Link>

        {/* ── Identity ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>
              {business.chamber_member === true && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  <BadgeCheck size={13} aria-hidden /> Chamber member
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {getCategoryLabel(business.category_slug)}
              {business.category_secondary && (
                <span className="text-slate-500"> · {business.category_secondary}</span>
              )}
              {business.price_tier && !business.price_tier_inferred && (
                <span className="text-slate-500"> · {business.price_tier}</span>
              )}
            </p>
            <div className="mt-3">
              <Rating rating={business.rating} count={business.review_count} />
            </div>

            <dl className="mt-5 space-y-2 text-sm">
              {business.address && (
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                  <span>
                    {business.address}
                    {business.neighborhood_label && (
                      <span className="text-slate-500"> · {business.neighborhood_label}</span>
                    )}
                  </span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone size={15} className="shrink-0 text-slate-500" aria-hidden />
                  <a href={`tel:${business.phone}`} className="transition-colors hover:text-amber-400">
                    {business.phone}
                  </a>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe size={15} className="shrink-0 text-slate-500" aria-hidden />
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate transition-colors hover:text-amber-400"
                  >
                    {business.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </dl>
          </div>

          {/* ── Claim CTA — the core loop (REBUILD-PLAN D11) ── */}
          <aside className="w-full shrink-0 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 lg:w-80">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldCheck size={17} aria-hidden />
              <h2 className="text-sm font-bold">Is this your business?</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Claim this profile to see everything we know about it, correct anything that’s out of
              date, and unlock your full market benchmark and connection suggestions — free.
            </p>
            <Link
              href={`/claim/${business.slug}`}
              className="mt-4 block rounded-xl bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
            >
              Claim this business
            </Link>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Ownership is verified with a one-time code sent to the phone number already on file.
            </p>
          </aside>
        </div>

        {/* ── Market position (constructive framing only — D10) ── */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-amber-500" aria-hidden />
            <h2 className="text-lg font-bold">Market position</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Category peers</p>
              <p className="mt-1 text-2xl font-bold">{benchmark.ratedPeers}</p>
              <p className="mt-1 text-xs text-slate-400">
                rated {benchmark.categoryLabel.toLowerCase()} businesses in Coral Gables
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rating standing</p>
              {benchmark.ratingPercentile != null ? (
                <>
                  <p className="mt-1 text-2xl font-bold">
                    Top {Math.max(1, 100 - benchmark.ratingPercentile)}%
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    meets or beats {benchmark.ratingPercentile}% of rated peers
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-bold text-slate-500">—</p>
                  <p className="mt-1 text-xs text-slate-400">not enough data yet</p>
                </>
              )}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Category average</p>
              <p className="mt-1 text-2xl font-bold">
                {benchmark.categoryAvgRating != null ? benchmark.categoryAvgRating.toFixed(1) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-400">average peer rating</p>
            </div>
          </div>

          {benchmark.opportunities.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2">
                <Lightbulb size={15} className="text-amber-500" aria-hidden />
                <h3 className="text-sm font-bold">Headroom</h3>
              </div>
              <ul className="mt-3 space-y-3">
                {benchmark.opportunities.map((o) => (
                  <li key={o.title} className="text-sm">
                    <p className="font-medium text-slate-200">{o.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{o.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-slate-600">
                Full benchmark detail is available to the verified owner of this profile.
              </p>
            </div>
          )}
        </section>

        {/* ── Connections ── */}
        {nearby.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold">Neighbors</h2>
            <p className="mt-1 text-sm text-slate-400">Businesses within a 2-minute walk.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((c) => (
                <BusinessCard key={c.business.id} business={c.business} note={c.reason} />
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold">Similar businesses nearby</h2>
            <p className="mt-1 text-sm text-slate-400">
              Other {benchmark.categoryLabel.toLowerCase()} businesses in the area.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((c) => (
                <BusinessCard key={c.business.id} business={c.business} note={c.reason} />
              ))}
            </div>
          </section>
        )}

        {/* ── Data provenance disclosure (trust design, D10) ── */}
        <section className="mt-10 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 text-xs leading-relaxed text-slate-500">
          <p>
            This profile was assembled from public sources (maps data, public records, and the
            Coral Gables business ecosystem). Something out of date?{" "}
            <Link href={`/claim/${business.slug}`} className="text-amber-400 hover:text-amber-300">
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
