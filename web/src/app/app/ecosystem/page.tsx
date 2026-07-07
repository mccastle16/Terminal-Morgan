import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getCategoryLabel, searchBusinesses, type Business } from "@/lib/data";
import {
  PageHeader,
  Card,
  SubtleCard,
  Badge,
  SectionLabel,
  EmptyState,
  MonoTag,
} from "@/components/terminal/ui";

export const metadata: Metadata = { title: "Ecosystem — CO_ Network" };

// Ecosystem is open to every role — the member network at a glance.

function catLabel(slug: string): string {
  const l = getCategoryLabel(slug);
  return l === slug ? slug.replace(/_/g, " ") : l;
}

export default async function EcosystemPage() {
  const session = await getSession();
  const all = searchBusinesses({ perPage: 100000 }).items;
  const members = all.filter((b) => b.chamber_member === true);

  // Categories ranked by member count, top-3 rated members each.
  const byCategory = new Map<string, { members: Business[]; total: number }>();
  for (const b of all) {
    const entry = byCategory.get(b.category_slug) ?? { members: [], total: 0 };
    entry.total += 1;
    if (b.chamber_member === true) entry.members.push(b);
    byCategory.set(b.category_slug, entry);
  }
  const categories = [...byCategory.entries()]
    .filter(([, v]) => v.members.length > 0)
    .sort((a, b) => b[1].members.length - a[1].members.length)
    .slice(0, 12)
    .map(([slug, v]) => ({
      slug,
      label: catLabel(slug),
      memberCount: v.members.length,
      total: v.total,
      top: [...v.members]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 3),
    }));

  // Recommended partners for the session business: members, different
  // category, rated 4.0+, best first.
  const me = session.business;
  const partners = members
    .filter(
      (b) =>
        b.id !== me.id &&
        b.category_slug !== me.category_slug &&
        b.rating != null &&
        b.rating >= 4.0
    )
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <PageHeader
        section="Insights"
        title="Ecosystem"
        description={`${members.length.toLocaleString()} verified members across the network — find partners and discover services by category.`}
      />

      {/* Recommended partners */}
      {partners.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Recommended partners for {me.name}</SectionLabel>
          <p className="text-caption text-fog">
            High-rated members in complementary categories.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {partners.map((b) => (
              <Link key={b.id} href={`/b/${b.slug}`} className="group">
                <SubtleCard className="h-full transition-colors duration-150 group-hover:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-w510 text-mist group-hover:text-paper">
                        {b.name}
                      </p>
                      <p className="mt-0.5 text-label capitalize text-ash">
                        {catLabel(b.category_slug)}
                        {b.neighborhood_label && <> · {b.neighborhood_label}</>}
                      </p>
                    </div>
                    <MonoTag>{b.rating?.toFixed(1)}</MonoTag>
                  </div>
                </SubtleCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Member categories */}
      <section className="space-y-3">
        <SectionLabel>Member services by category</SectionLabel>
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat.slug} padded={false}>
                <div className="flex items-center justify-between gap-3 border-b border-graphite px-6 py-4">
                  <p className="text-body-sm font-w510 capitalize text-paper">{cat.label}</p>
                  <Badge>
                    {cat.memberCount} member{cat.memberCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="divide-y divide-graphite">
                  {cat.top.map((b, i) => (
                    <Link
                      key={b.id}
                      href={`/b/${b.slug}`}
                      className="flex items-center gap-3 px-6 py-2.5 transition-colors duration-150 hover:bg-white/[0.02]"
                    >
                      <MonoTag>{String(i + 1).padStart(2, "0")}</MonoTag>
                      <p className="min-w-0 flex-1 truncate text-caption text-mist">{b.name}</p>
                      <p className="text-caption text-fog">
                        {b.rating != null ? b.rating.toFixed(1) : "—"}
                      </p>
                    </Link>
                  ))}
                </div>
                <p className="border-t border-graphite px-6 py-2.5 text-label text-ash">
                  {cat.total} in directory
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No member categories yet"
            detail="Verified members will appear here grouped by category."
          />
        )}
      </section>
    </div>
  );
}
