import Link from "next/link";
import { getCategories, getCategoryLabel, getStats, searchBusinesses } from "@/lib/data";

// Hero product visual — linear.app pattern: the hero IS the app. A static,
// scaled-down replica of the signed-in terminal's analytics view built from
// real snapshot data, framed as a Carbon card sitting on a gradient that
// bleeds from a distinguishing wash into the Void canvas (the one sanctioned
// gradient in LinearDesign.md). Clicking anywhere enters the live preview.

const SIDEBAR: { group: string; items: { label: string; active?: boolean }[] }[] = [
  {
    group: "Core",
    items: [{ label: "Overview" }, { label: "Analytics", active: true }, { label: "My Business" }],
  },
  {
    group: "Insights",
    items: [{ label: "Opportunities" }, { label: "Intelligence" }, { label: "Graph" }],
  },
  {
    group: "Actions",
    items: [{ label: "Recruit" }, { label: "Risks" }, { label: "Alerts" }],
  },
];

export function HeroTerminal() {
  const stats = getStats();
  const all = searchBusinesses({ perPage: stats.total }).items;
  const members = all.filter((b) => b.chamber_member === true).length;
  const unknown = all.filter((b) => b.chamber_member === null).length;
  const withWebsite = all.filter((b) => b.website != null).length;

  // Top categories split by membership for the stacked bars.
  const byCat = new Map<string, { m: number; n: number; u: number; total: number }>();
  for (const b of all) {
    const s = byCat.get(b.category_slug) ?? { m: 0, n: 0, u: 0, total: 0 };
    if (b.chamber_member === true) s.m += 1;
    else if (b.chamber_member === false) s.n += 1;
    else s.u += 1;
    s.total += 1;
    byCat.set(b.category_slug, s);
  }
  const topCats = [...byCat.entries()]
    .sort((a, z) => z[1].total - a[1].total)
    .slice(0, 6)
    .map(([slug, s]) => ({ label: getCategoryLabel(slug), ...s }));
  const maxCat = Math.max(1, ...topCats.map((c) => c.total));

  // Top rated list for the right column.
  const topRated = all
    .filter((b) => b.rating != null && b.review_count != null && b.review_count >= 20)
    .sort((a, z) => (z.rating ?? 0) - (a.rating ?? 0) || (z.review_count ?? 0) - (a.review_count ?? 0))
    .slice(0, 5);

  const kpis = [
    { label: "Businesses", value: stats.total.toLocaleString() },
    { label: "Members", value: members.toLocaleString(), detail: `${((members / stats.total) * 100).toFixed(1)}%` },
    { label: "Unknown status", value: unknown.toLocaleString() },
    { label: "With website", value: `${((withWebsite / stats.total) * 100).toFixed(0)}%` },
  ];

  return (
    <div className="relative mt-16">
      {/* Gradient bleed — distinguishing wash dissolving into the Void canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -top-24 bottom-0"
        style={{
          background:
            "radial-gradient(55% 60% at 50% 8%, rgba(99, 102, 241, 0.16) 0%, rgba(2, 184, 204, 0.05) 45%, rgba(8, 9, 10, 0) 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -bottom-8 h-40 opacity-[0.12] blur-3xl"
        style={{
          background: "linear-gradient(to bottom, rgb(8, 9, 10) 10%, rgb(208, 214, 224) 100%)",
        }}
      />

      {/* The app, framed */}
      <Link
        href="/app/preview?role=leadership"
        aria-label="Open the live terminal preview"
        className="relative block cursor-pointer overflow-hidden rounded-cards bg-carbon shadow-subtle transition-transform duration-200 hover:-translate-y-0.5"
      >
        <div className="flex">
          {/* Mini sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-graphite bg-carbon px-3 py-4 sm:block">
            <p className="px-2 text-label font-w510 text-paper">CO_ Network</p>
            <div className="mt-4 space-y-4">
              {SIDEBAR.map((g) => (
                <div key={g.group}>
                  <p className="px-2 pb-1 text-[10px] font-w510 uppercase tracking-wide text-ash">
                    {g.group}
                  </p>
                  {g.items.map((it) => (
                    <p
                      key={it.label}
                      className={`rounded-buttons px-2 py-1 text-label ${
                        it.active ? "bg-white/[0.06] text-paper" : "text-fog"
                      }`}
                    >
                      {it.label}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Main content — the analytics view */}
          <div className="min-w-0 flex-1 bg-void p-5 sm:p-6">
            <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">Core</p>
            <p className="mt-0.5 text-body-lg font-w510 text-paper">Analytics</p>

            {/* KPI row */}
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-buttons bg-carbon p-3 shadow-subtle">
                  <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">{k.label}</p>
                  <p className="mt-1 text-subheading font-w510 text-paper">
                    {k.value}
                    {k.detail && <span className="ml-1.5 text-label font-normal text-fog">{k.detail}</span>}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
              {/* Membership by category — stacked bars */}
              <div className="rounded-buttons bg-carbon p-4 shadow-subtle lg:col-span-3">
                <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">
                  Membership by category
                </p>
                <div className="mt-3 space-y-2.5">
                  {topCats.map((c) => (
                    <div key={c.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-label text-fog">{c.label}</span>
                      <span className="flex h-2 flex-1 overflow-hidden rounded-pills bg-white/[0.04]">
                        <span className="h-2 bg-mist" style={{ width: `${(c.m / maxCat) * 100}%` }} />
                        <span className="h-2 bg-iris-violet" style={{ width: `${(c.n / maxCat) * 100}%` }} />
                        <span className="h-2 bg-lavender/70" style={{ width: `${(c.u / maxCat) * 100}%` }} />
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-[10px] tracking-[-0.013em] text-fog">
                        {c.total}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-[10px] text-ash">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-small bg-mist" /> Members</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-small bg-iris-violet" /> Non-members</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-small bg-lavender/70" /> Unknown</span>
                </div>
              </div>

              {/* Top rated list */}
              <div className="hidden rounded-buttons bg-carbon p-4 shadow-subtle lg:col-span-2 lg:block">
                <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">
                  Highest rated · 20+ reviews
                </p>
                <div className="mt-2 divide-y divide-graphite">
                  {topRated.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-2 py-1.5">
                      <span className="w-3 shrink-0 text-[10px] text-ash">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-label text-mist">{b.name}</span>
                      <span className="shrink-0 text-label font-w510 text-paper">
                        {b.rating?.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
