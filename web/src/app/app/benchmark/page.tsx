import type { Metadata } from "next";
import { getSessionBusiness } from "@/lib/session";
import { getBenchmark, getRatingDistribution } from "@/lib/data";

export const metadata: Metadata = { title: "Benchmark — CO_ Network" };

// Full benchmark view — peer distributions, never named loser-comparisons
// (REBUILD-PLAN D10 / D8 #2). Monochrome bars per DESIGN.md.
export default async function BenchmarkPage() {
  const business = await getSessionBusiness();
  const benchmark = getBenchmark(business);
  const distribution = getRatingDistribution(business.category_slug);
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  const myBand =
    business.rating != null
      ? distribution.find((d) => business.rating! >= d.min && business.rating! < d.max)?.label
      : null;

  return (
    <div>
      <p className="text-label font-medium text-graphite">Benchmark</p>
      <h1 className="mt-1 text-heading font-semibold text-obsidian">
        Where you stand among {benchmark.categoryLabel.toLowerCase()} businesses
      </h1>
      <p className="mt-2 max-w-xl text-body font-normal text-graphite">
        Compared against every rated {benchmark.categoryLabel.toLowerCase()} business in Coral
        Gables — {benchmark.ratedPeers} peers. Shown as distributions, not rankings: the point is
        headroom, not a leaderboard.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {business.rating != null ? business.rating.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">your rating</p>
        </div>
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {benchmark.categoryAvgRating != null ? benchmark.categoryAvgRating.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">category average</p>
        </div>
        <div>
          <p className="text-display font-medium tracking-[-1.44px] text-obsidian">
            {benchmark.ratingPercentile != null
              ? `Top ${Math.max(1, 100 - benchmark.ratingPercentile)}%`
              : "—"}
          </p>
          <p className="mt-1 text-caption font-normal text-graphite">
            {benchmark.ratingPercentile != null
              ? `meets or beats ${benchmark.ratingPercentile}% of rated peers`
              : "not enough rated peers yet"}
          </p>
        </div>
      </div>

      {/* Rating distribution — monochrome bars, your band marked in text */}
      <section className="mt-14 max-w-2xl">
        <h2 className="text-subheading font-medium text-obsidian">
          Rating distribution in your category
        </h2>
        <ul className="mt-4 space-y-3">
          {distribution.map((band) => (
            <li key={band.label} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-label font-medium text-graphite">
                {band.label}
              </span>
              <span className="h-4 flex-1 rounded-links bg-whisper">
                <span
                  className={`block h-4 rounded-links ${
                    band.label === myBand ? "bg-obsidian" : "bg-smoke/40"
                  }`}
                  style={{ width: `${Math.max(1, (band.count / maxCount) * 100)}%` }}
                  aria-hidden
                />
              </span>
              <span className="w-24 shrink-0 text-right text-label font-normal text-graphite">
                {band.count}
                {band.label === myBand && (
                  <span className="ml-1.5 font-medium text-obsidian">· you</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-caption font-normal text-smoke">
          Count of rated {benchmark.categoryLabel.toLowerCase()} businesses per rating band. Your
          band is marked in black.
        </p>
      </section>

      {/* Headroom */}
      {benchmark.opportunities.length > 0 && (
        <section className="mt-14 max-w-2xl">
          <h2 className="text-subheading font-medium text-obsidian">Headroom</h2>
          <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
            {benchmark.opportunities.map((o) => (
              <li key={o.title} className="py-4">
                <p className="text-body font-medium text-obsidian">{o.title}</p>
                <p className="mt-1 text-label font-normal leading-relaxed text-graphite">
                  {o.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
