import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getInternal } from "@/lib/terminal/internal";
import {
  getBenchmark,
  getCategoryLabel,
  getNearby,
  getRatingDistribution,
  getSimilar,
  type Business,
  type Connection,
} from "@/lib/data";
import {
  Badge,
  Card,
  PageHeader,
  SectionLabel,
  StatCard,
  primaryBtnCls,
} from "@/components/terminal/ui";

export const metadata: Metadata = { title: "My Business — CO_ Network" };

// My Business — the consolidated owner view: profile + sources, benchmark,
// connections, and review themes in one surface. Non-members get a limited
// teaser with a single claim CTA.
export default async function MyBusinessPage() {
  const { role, business } = await getSession();
  const categoryLabel = getCategoryLabel(business.category_slug);
  const subtitle = `${categoryLabel}${business.neighborhood_label ? ` · ${business.neighborhood_label}` : ""}`;

  // ── Non-member teaser ────────────────────────────────────────────────────
  if (role === "nonmember") {
    return (
      <div className="space-y-8">
        <PageHeader section="Core" title={business.name} description={subtitle} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Rating"
            value={business.rating != null ? business.rating.toFixed(1) : "—"}
            detail={
              business.review_count != null
                ? `${business.review_count} reviews`
                : "no public reviews yet"
            }
          />
          <StatCard label="Category" value={categoryLabel} detail="from public sources" />
          <StatCard label="Profile" value="Unclaimed" detail="preview access only" />
        </div>

        <Card>
          <SectionLabel>Claim this profile</SectionLabel>
          <h2 className="mt-2 text-subheading font-w510 text-paper">
            See the full picture of your business
          </h2>
          <p className="mt-2 max-w-xl text-body-sm text-fog">
            Benchmarks against your category peers, suggested connections from real
            signals, review themes, and the ability to correct what the network
            knows about you — all unlock when you claim this profile.
          </p>
          <div className="mt-5">
            <Link href={`/claim/${business.slug}`} className={primaryBtnCls()}>
              Claim your business
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ── Full owner view ──────────────────────────────────────────────────────
  const benchmark = getBenchmark(business);
  const distribution = getRatingDistribution(business.category_slug);
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  const myBand =
    business.rating != null
      ? distribution.find(
          (d) => (business.rating as number) >= d.min && (business.rating as number) < d.max
        )?.label ?? null
      : null;

  const nearby = getNearby(business, 200, 8);
  const similar = getSimilar(business, 8);

  const canReviews = hasPermission(role, "view_reviews");
  const internal = canReviews ? getInternal(business.id) : undefined;
  const delights =
    internal?.top_delights?.split(";").map((s) => s.trim()).filter(Boolean) ?? [];
  const pains =
    internal?.top_pain_points?.split(";").map((s) => s.trim()).filter(Boolean) ?? [];

  const memberBadge =
    business.chamber_member === true ? (
      <Badge color="var(--color-pulse-green)">Chamber member</Badge>
    ) : business.chamber_member === false ? (
      <Badge>Non-member</Badge>
    ) : (
      <Badge>Membership unknown</Badge>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        section="Core"
        title={business.name}
        description={subtitle}
        actions={memberBadge}
      />

      {/* Standing at a glance */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Your rating"
          value={business.rating != null ? business.rating.toFixed(1) : "—"}
          detail={
            business.review_count != null
              ? `${business.review_count} reviews`
              : "no public reviews yet"
          }
        />
        <StatCard
          label="Category average"
          value={
            benchmark.categoryAvgRating != null
              ? benchmark.categoryAvgRating.toFixed(1)
              : "—"
          }
          detail={`across ${benchmark.ratedPeers} rated peers`}
        />
        <StatCard
          label="Standing"
          value={
            benchmark.ratingPercentile != null
              ? `Top ${Math.max(1, 100 - benchmark.ratingPercentile)}%`
              : "—"
          }
          detail={
            benchmark.ratingPercentile != null
              ? `meets or beats ${benchmark.ratingPercentile}% of peers`
              : "not enough rated peers yet"
          }
        />
        <StatCard
          label="Connections"
          value={nearby.length + similar.length}
          detail="suggested from real signals"
        />
      </div>

      {/* Profile & sources */}
      <Card>
        <SectionLabel>Profile &amp; sources</SectionLabel>
        <p className="mt-1 text-caption text-fog">
          Every field was gathered from public sources. Once verified, your
          corrections take priority over every other source — permanently.
        </p>
        <ul className="mt-4 divide-y divide-graphite">
          {profileRows(business, categoryLabel).map((r) => (
            <li key={r.field} className="flex items-baseline gap-6 py-3.5">
              <span className="w-36 shrink-0 text-label font-w510 uppercase tracking-wide text-ash">
                {r.field}
              </span>
              <span className="min-w-0 flex-1">
                {r.value ? (
                  <span className="text-body-sm text-mist">{r.value}</span>
                ) : (
                  <span className="text-body-sm text-ash">Not on file</span>
                )}
                <span className="mt-0.5 block text-caption text-fog">
                  Source: {r.source}
                </span>
              </span>
              <span
                className="shrink-0 cursor-default rounded-pills border border-graphite px-3 py-1 text-caption text-ash"
                title="Corrections open with verified accounts"
              >
                Correct
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption text-fog">
          Corrections are disabled in preview. With a verified account, low-risk
          fields (phone, website, hours) apply immediately; identity fields go
          through a short review.
        </p>
      </Card>

      {/* Benchmark */}
      <Card>
        <SectionLabel>Benchmark</SectionLabel>
        <p className="mt-1 text-caption text-fog">
          Compared against every rated {benchmark.categoryLabel.toLowerCase()} business
          in Coral Gables — {benchmark.ratedPeers} peers. Distributions, not rankings:
          the point is headroom, not a leaderboard.
        </p>

        <ul className="mt-5 space-y-3">
          {distribution.map((band) => (
            <li key={band.label} className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-label text-ash">{band.label}</span>
              <span className="h-1.5 min-w-0 flex-1 rounded-pills bg-white/5">
                <span
                  className={`block h-1.5 rounded-pills ${
                    band.label === myBand ? "bg-mist" : "bg-white/10"
                  }`}
                  style={{ width: `${Math.max(2, (band.count / maxCount) * 100)}%` }}
                  aria-hidden
                />
              </span>
              <span className="w-20 shrink-0 text-right text-label text-fog">
                {band.count}
                {band.label === myBand && (
                  <span className="ml-1.5 font-w510 text-paper">· you</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-caption text-fog">
          Rated {benchmark.categoryLabel.toLowerCase()} businesses per rating band —
          your band is marked.
        </p>

        {benchmark.opportunities.length > 0 && (
          <div className="mt-6 border-t border-graphite pt-4">
            <SectionLabel>Headroom</SectionLabel>
            <ul className="mt-2 divide-y divide-graphite">
              {benchmark.opportunities.map((o) => (
                <li key={o.title} className="py-3.5">
                  <p className="text-body-sm font-w510 text-paper">{o.title}</p>
                  <p className="mt-1 text-caption text-fog">{o.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Connections */}
      <Card>
        <SectionLabel>Connections</SectionLabel>
        <p className="mt-1 text-caption text-fog">
          Suggested from real signals — proximity, category, shared context. Every
          suggestion says why it was made; confirmed connections appear on your
          public page.
        </p>

        {nearby.length > 0 && (
          <section className="mt-5">
            <p className="text-body-sm font-w510 text-paper">Neighbors</p>
            <p className="mt-0.5 text-caption text-fog">
              Within a two-minute walk of your door.
            </p>
            <ConnectionRows connections={nearby} />
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-6">
            <p className="text-body-sm font-w510 text-paper">Same field, same area</p>
            <p className="mt-0.5 text-caption text-fog">
              Peers worth knowing — for referrals, benchmarking, or simply awareness.
            </p>
            <ConnectionRows connections={similar} />
          </section>
        )}

        {nearby.length === 0 && similar.length === 0 && (
          <p className="mt-5 text-body-sm text-fog">
            No high-confidence suggestions yet — this usually means the business
            doesn&apos;t have an exact map location on file. Correcting your address
            will unlock proximity connections.
          </p>
        )}

        <p className="mt-5 border-t border-graphite pt-4 text-caption text-fog">
          Confirm and dismiss are disabled in preview — they open with verified
          accounts. Complementary-service matching arrives after launch.
        </p>
      </Card>

      {/* Review themes */}
      {canReviews && (delights.length > 0 || pains.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionLabel>What customers love</SectionLabel>
            {delights.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {delights.map((d, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-4 shrink-0 text-label text-ash">{i + 1}</span>
                    <p className="text-body-sm text-mist">{d}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-caption text-fog">No delight themes on file yet.</p>
            )}
          </Card>
          <Card>
            <SectionLabel>What customers mention</SectionLabel>
            {pains.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {pains.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-4 shrink-0 text-label text-ash">{i + 1}</span>
                    <p className="text-body-sm text-mist">{p}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-caption text-fog">No recurring themes on file yet.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function profileRows(
  business: Business,
  categoryLabel: string
): { field: string; value: string | null; source: string }[] {
  return [
    { field: "Name", value: business.name, source: "Public records" },
    {
      field: "Category",
      value:
        categoryLabel +
        (business.category_secondary ? ` · ${business.category_secondary}` : ""),
      source: "Maps data",
    },
    { field: "Address", value: business.address, source: "Maps data" },
    {
      field: "Neighborhood",
      value: business.neighborhood_label,
      source: "Derived from address",
    },
    { field: "Phone", value: business.phone, source: "Maps data" },
    { field: "Website", value: business.website, source: "Maps data" },
    {
      field: "Price tier",
      value: business.price_tier,
      source: business.price_tier_inferred
        ? "Estimated — needs owner confirmation"
        : "Maps data",
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
      field: "Membership",
      value:
        business.chamber_member === true
          ? "Member"
          : business.chamber_member === false
            ? "Not a member"
            : "Unknown",
      source: "Chamber of Commerce directory",
    },
  ];
}

function ConnectionRows({ connections }: { connections: Connection[] }) {
  return (
    <ul className="mt-2 divide-y divide-graphite">
      {connections.map((c) => (
        <li key={c.business.id} className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/b/${c.business.slug}`}
              className="cursor-pointer text-body-sm font-w510 text-paper transition-colors duration-150 hover:text-mist"
            >
              {c.business.name}
            </Link>
            <p className="truncate text-caption text-fog">
              {getCategoryLabel(c.business.category_slug)} · {c.reason}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <span
              className="cursor-default rounded-pills border border-graphite px-3 py-1 text-caption text-ash"
              title="Opens with verified accounts"
            >
              Confirm
            </span>
            <span
              className="cursor-default rounded-pills px-2 py-1 text-caption text-ash"
              title="Opens with verified accounts"
            >
              Dismiss
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
