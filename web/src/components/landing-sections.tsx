import Link from "next/link";
import {
  getCategoryLabel,
  getRatingDistribution,
  getStats,
  searchBusinesses,
} from "@/lib/data";

// Landing middle content — linear.app's landing anatomy translated to CO_:
// source strip (their logo strip), intro statement + three fragment cards,
// alternating showcases (heading-left / copy-right + numbered index link,
// product visual, numbered footnotes), a network log (their changelog), a
// light-lavender + acid-lime statement band (their testimonial band), and a
// huge centered closing CTA. Every visual is a fragment of the actual
// product rendered from real snapshot data — no stock imagery, no fakes.

// ── Shared showcase scaffold ────────────────────────────────────────────────

function Showcase({
  id,
  index,
  indexHref,
  indexLabel,
  heading,
  copy,
  footnotes,
  children,
}: {
  id?: string;
  index: string;
  indexHref: string;
  indexLabel: string;
  heading: React.ReactNode;
  copy: string;
  footnotes: [string, string][];
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1200px] scroll-mt-16 px-6 py-24">
      <div className="grid grid-cols-1 gap-x-16 gap-y-8 md:grid-cols-2">
        <h2 className="max-w-md text-heading-sm font-w510 text-paper sm:text-heading">
          {heading}
        </h2>
        <div className="md:pt-2">
          <p className="max-w-lg text-body-lg font-normal text-mist">{copy}</p>
          <Link
            href={indexHref}
            className="mt-6 inline-flex items-baseline gap-2 text-body-sm text-fog transition-colors duration-150 hover:text-mist"
          >
            <span className="font-mono text-caption tracking-[-0.013em]">{index}</span>
            <span className="font-w510 text-mist">{indexLabel} →</span>
          </Link>
        </div>
      </div>

      <div className="mt-12">{children}</div>

      <div className="mt-10 flex justify-end">
        <div className="grid grid-cols-2 gap-x-12 gap-y-2.5">
          {footnotes.map(([n, label]) => (
            <p key={n} className="flex items-baseline gap-2.5 text-caption text-fog">
              <span className="font-mono text-label tracking-[-0.013em] text-ash">{n}</span>
              <span className="font-w510 text-mist">{label}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-cards bg-carbon shadow-subtle ${className}`}>
      {children}
    </div>
  );
}

// ── Source strip (logo-strip analog) ────────────────────────────────────────

const SOURCES = [
  "OpenStreetMap",
  "Google Maps data",
  "Florida SunBiz",
  "Chamber directory",
  "Public records",
  "Owner corrections",
];

export function SourceStrip() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-20">
      <p className="text-center text-caption text-ash">
        Assembled from the sources that already describe your business
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {SOURCES.map((s) => (
          <span key={s} className="text-body-sm font-w510 text-paper">
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Intro statement + three product fragments ───────────────────────────────

export function IntroBand() {
  const stats = getStats();
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-24">
      <p className="max-w-3xl text-subheading font-w510 text-paper sm:text-heading-sm sm:leading-[1.25]">
        A new kind of local network.{" "}
        <span className="text-fog">
          Purpose-built for the {stats.total.toLocaleString()} businesses of Coral Gables — a
          living map of who’s here, how they connect, and where each one has room to grow.
        </span>
      </p>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Provenance fragment */}
        <div className="rounded-cards bg-carbon p-6 shadow-subtle">
          <div className="rounded-buttons bg-void p-4">
            <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">Phone</p>
            <p className="mt-1 text-body-sm text-mist">(305) 442-••••</p>
            <p className="mt-1.5 text-label text-fog">
              Source: <span className="text-pulse-green">owner</span> · takes priority
            </p>
          </div>
          <h3 className="mt-5 text-body-lg font-w510 text-paper">Built on provenance</h3>
          <p className="mt-2 text-body-sm text-fog">
            Every field shows where it came from. Owners see everything, and their corrections
            outrank every other source.
          </p>
        </div>

        {/* Benchmark fragment */}
        <div className="rounded-cards bg-carbon p-6 shadow-subtle">
          <div className="rounded-buttons bg-void p-4">
            <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">
              Rating standing
            </p>
            <p className="mt-1 text-subheading font-w510 text-paper">Top 4%</p>
            <p className="mt-0.5 text-label text-fog">of 117 rated legal peers</p>
          </div>
          <h3 className="mt-5 text-body-lg font-w510 text-paper">Benchmarks, not judgment</h3>
          <p className="mt-2 text-body-sm text-fog">
            Percentiles against your real local peers, framed as headroom. Distributions, never
            leaderboards of losers.
          </p>
        </div>

        {/* Connection fragment */}
        <div className="rounded-cards bg-carbon p-6 shadow-subtle">
          <div className="rounded-buttons bg-void p-4">
            <p className="truncate text-body-sm font-w510 text-mist">Premier Golf Fitting</p>
            <p className="mt-0.5 text-label text-fog">Retail · 32 m away</p>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-pills border border-graphite px-2.5 py-0.5 text-label text-mist">
                Confirm
              </span>
              <span className="rounded-pills px-2 py-0.5 text-label text-ash">Dismiss</span>
            </div>
          </div>
          <h3 className="mt-5 text-body-lg font-w510 text-paper">
            Connections that explain themselves
          </h3>
          <p className="mt-2 text-body-sm text-fog">
            Neighbors, peers, complementary services — every suggestion says why, and you decide
            what sticks.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Showcase 1 · Own your record ────────────────────────────────────────────

export function OwnYourRecord() {
  const rows = [
    { field: "Name", value: "Arias & Abbass Your Attorneys", src: "Public records", owner: false },
    { field: "Category", value: "Legal", src: "Maps data", owner: false },
    { field: "Phone", value: "(305) 442-••••", src: "Owner — takes priority", owner: true },
    { field: "Website", value: "ariasabbass.com", src: "Maps data", owner: false },
    { field: "Price tier", value: "Not on file", src: "Estimated — needs confirmation", owner: false },
  ];
  return (
    <Showcase
      id="features"
      index="1.0"
      indexHref="/app/preview?role=member"
      indexLabel="My Business"
      heading={
        <>
          Own your
          <br />
          record
        </>
      }
      copy="Your profile already exists, assembled from public sources. Claim it to see every field and where it came from, correct what's wrong, and lock it in — owner corrections outrank every other source, permanently."
      footnotes={[
        ["1.1", "Profile & data"],
        ["1.2", "Corrections"],
        ["1.3", "Per-field provenance"],
        ["1.4", "Claim & verify"],
      ]}
    >
      <Frame>
        <div className="border-b border-graphite px-6 py-3">
          <p className="text-label font-w510 text-paper">
            Profile &amp; data
            <span className="ml-2 font-normal text-ash">what the network knows about you</span>
          </p>
        </div>
        <div className="divide-y divide-graphite px-6">
          {rows.map((r) => (
            <div key={r.field} className="flex items-center gap-6 py-3.5">
              <span className="w-24 shrink-0 text-caption font-w510 text-fog sm:w-32">
                {r.field}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-body-sm ${r.value === "Not on file" ? "text-ash" : "text-mist"}`}>
                  {r.value}
                </span>
                <span className={`text-label ${r.owner ? "text-pulse-green" : "text-ash"}`}>
                  {r.src}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-pills border px-3 py-0.5 text-label font-w510 ${
                  r.owner ? "border-transparent text-ash" : "border-graphite text-mist"
                }`}
              >
                {r.owner ? "Corrected" : "Correct"}
              </span>
            </div>
          ))}
        </div>
      </Frame>
    </Showcase>
  );
}

// ── Showcase 2 · Know where you stand ───────────────────────────────────────

export function KnowWhereYouStand() {
  const dist = getRatingDistribution("legal");
  const max = Math.max(1, ...dist.map((d) => d.count));
  const myBand = "4.5 – 5.0";
  return (
    <Showcase
      index="2.0"
      indexHref="/app/preview?role=member"
      indexLabel="Benchmark"
      heading={
        <>
          Know where
          <br />
          you stand
        </>
      }
      copy="Rating standing, review volume, and digital presence measured against the businesses actually around you. Shown as distributions with your band marked — the point is headroom, not a leaderboard."
      footnotes={[
        ["2.1", "Rating standing"],
        ["2.2", "Peer distributions"],
        ["2.3", "Headroom"],
        ["2.4", "Category intel"],
      ]}
    >
      <Frame>
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="border-b border-graphite p-6 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">Your rating</p>
            <p className="mt-2 text-heading font-w510 text-paper">5.0</p>
            <p className="mt-8 text-[10px] font-w510 uppercase tracking-wide text-ash">
              Standing
            </p>
            <p className="mt-2 text-heading-sm font-w510 text-paper">Top 4%</p>
            <p className="mt-1 text-caption text-fog">of 117 rated legal peers in Coral Gables</p>
          </div>
          <div className="p-6 lg:col-span-2">
            <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">
              Rating distribution · legal · Coral Gables
            </p>
            <div className="mt-5 space-y-3">
              {dist.map((band) => (
                <div key={band.label} className="flex items-center gap-4">
                  <span className="w-20 shrink-0 text-caption font-w510 text-fog">
                    {band.label}
                  </span>
                  <span className="h-3 flex-1 rounded-small bg-white/[0.04]">
                    <span
                      className={`block h-3 rounded-small ${
                        band.label === myBand ? "bg-mist" : "bg-smoke"
                      }`}
                      style={{ width: `${Math.max(1.5, (band.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right text-caption text-fog">
                    {band.count}
                    {band.label === myBand && (
                      <span className="ml-1 font-w510 text-paper">· you</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    </Showcase>
  );
}

// ── Showcase 3 · Your corner of the network ─────────────────────────────────

const EGO_NODES = [
  { x: 250, y: 130, r: 10, c: "#d0d6e0", label: "" }, // center
  { x: 120, y: 60, r: 5, c: "#6366f1", label: "" },
  { x: 90, y: 170, r: 5, c: "#6366f1", label: "" },
  { x: 200, y: 235, r: 5, c: "#27a644", label: "" },
  { x: 360, y: 210, r: 5, c: "#6366f1", label: "" },
  { x: 400, y: 90, r: 5, c: "#27a644", label: "" },
  { x: 300, y: 35, r: 5, c: "#8b5cf6", label: "" },
];

export function CornerOfNetwork() {
  const connections = [
    { name: "Golf Pro Shop", meta: "Retail · 17 m away", kind: "Neighbor" },
    { name: "Premier Golf Fitting", meta: "Retail · 32 m away", kind: "Neighbor" },
    { name: "The Farber Law Firm", meta: "Legal · same category, ~1 km", kind: "Peer" },
    { name: "Biltmore Hotel Miami", meta: "Hospitality · 140 m away", kind: "Neighbor" },
  ];
  return (
    <Showcase
      index="3.0"
      indexHref="/app/preview?role=member"
      indexLabel="Connections"
      heading={
        <>
          See your corner
          <br />
          of the network
        </>
      }
      copy="A relationship graph of the whole city, scoped to you. Walkable neighbors, category peers, and complementary businesses — confirm the ones that matter and they appear on your public page."
      footnotes={[
        ["3.1", "Neighbors"],
        ["3.2", "Similar businesses"],
        ["3.3", "Confirm & dismiss"],
        ["3.4", "Public page"],
      ]}
    >
      <Frame>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Ego-graph — a product artifact, drawn from the edge model */}
          <div className="relative border-b border-graphite lg:border-b-0 lg:border-r">
            <svg viewBox="0 0 500 270" className="h-full min-h-[260px] w-full" aria-hidden>
              {EGO_NODES.slice(1).map((n, i) => (
                <line
                  key={i}
                  x1={EGO_NODES[0].x}
                  y1={EGO_NODES[0].y}
                  x2={n.x}
                  y2={n.y}
                  stroke="rgba(255,255,255,0.09)"
                  strokeWidth="1"
                />
              ))}
              {EGO_NODES.map((n, i) => (
                <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.c} fillOpacity={i === 0 ? 1 : 0.85} />
              ))}
            </svg>
            <p className="absolute bottom-4 left-6 text-label text-ash">
              Your ego-graph · <span className="text-fog">neighbors, peers, partners</span>
            </p>
          </div>
          <div className="divide-y divide-graphite px-6 py-2">
            {connections.map((c) => (
              <div key={c.name} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-w510 text-mist">{c.name}</p>
                  <p className="text-label text-fog">{c.meta}</p>
                </div>
                <span className="shrink-0 rounded-badges bg-white/5 px-1.5 py-px text-label text-fog">
                  {c.kind}
                </span>
                <span className="shrink-0 rounded-pills border border-graphite px-3 py-0.5 text-label font-w510 text-mist">
                  Confirm
                </span>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    </Showcase>
  );
}

// ── Showcase 4 · Ask the market anything ────────────────────────────────────

export function AskTheMarket() {
  const top = searchBusinesses({ category: "food_beverage", neighborhood: "Miracle Mile" })
    .items.filter((b) => b.rating != null && (b.review_count ?? 0) >= 20)
    .sort((a, z) => (z.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);
  return (
    <Showcase
      index="4.0"
      indexHref="/app/preview?role=member"
      indexLabel="AI Adviser"
      heading={
        <>
          Ask the market
          <br />
          anything
        </>
      }
      copy="A local adviser computed from the live snapshot — rankings, comparisons, counts, and category breakdowns. Answers come from the data, never invention, and every chat is saved and searchable."
      footnotes={[
        ["4.1", "Saved chats"],
        ["4.2", "Rankings"],
        ["4.3", "Comparisons"],
        ["4.4", "Market counts"],
      ]}
    >
      <Frame className="mx-auto max-w-3xl">
        <div className="p-6">
          <div className="flex justify-end">
            <p className="rounded-[20px] bg-white/[0.06] px-4 py-2 text-body-sm text-mist">
              Top restaurants on Miracle Mile
            </p>
          </div>
          <p className="mt-5 text-body-sm text-mist">
            Top {top.length} food &amp; beverage on Miracle Mile, ranked by public rating among
            businesses with real reviews:
          </p>
          <div className="mt-3 divide-y divide-graphite rounded-buttons bg-void px-4">
            {top.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 py-2.5">
                <span className="w-4 shrink-0 text-label text-ash">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-caption font-w510 text-mist">
                  {b.name}
                </span>
                <span className="shrink-0 text-caption text-fog">
                  {b.review_count} reviews
                </span>
                <span className="shrink-0 text-caption font-w510 text-paper">
                  {b.rating?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          {/* Composer fragment */}
          <div className="mt-6 flex items-center gap-2 rounded-[26px] border border-white/[0.08] bg-white/[0.03] py-2 pl-5 pr-2">
            <span className="flex-1 text-[15px] text-fog">Ask anything about the market</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-void">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Frame>
    </Showcase>
  );
}

// ── Showcase 5 · The whole market (staff/partners) ──────────────────────────

export function WholeMarket() {
  const stats = getStats();
  const all = searchBusinesses({ perPage: stats.total }).items;
  const members = all.filter((b) => b.chamber_member === true).length;
  const unknown = all.filter((b) => b.chamber_member === null).length;

  const byNb = new Map<string, { m: number; total: number }>();
  for (const b of all) {
    if (!b.neighborhood_label) continue;
    const s = byNb.get(b.neighborhood_label) ?? { m: 0, total: 0 };
    if (b.chamber_member === true) s.m += 1;
    s.total += 1;
    byNb.set(b.neighborhood_label, s);
  }
  const topNb = [...byNb.entries()]
    .sort((a, z) => z[1].total - a[1].total)
    .slice(0, 5)
    .map(([label, s]) => ({ label, pct: (s.m / s.total) * 100, total: s.total }));

  return (
    <Showcase
      index="5.0"
      indexHref="/app/preview?role=leadership"
      indexLabel="Leadership view"
      heading={
        <>
          Understand the
          <br />
          whole market
        </>
      }
      copy="For the chamber and city partners: penetration by category and corridor, a scored recruiting queue, risk signals, and exports — the full market map, role-scoped so owners' private data stays private."
      footnotes={[
        ["5.1", "Analytics"],
        ["5.2", "Recruit queue"],
        ["5.3", "Risk radar"],
        ["5.4", "Exports"],
      ]}
    >
      <Frame>
        <div className="grid grid-cols-2 divide-x divide-graphite border-b border-graphite lg:grid-cols-4">
          {[
            { label: "Businesses", value: stats.total.toLocaleString() },
            { label: "Members", value: `${members.toLocaleString()}`, detail: `${((members / stats.total) * 100).toFixed(1)}%` },
            { label: "Unknown status", value: unknown.toLocaleString() },
            { label: "Top prospects", value: "A-band", detail: "scored 0–100" },
          ].map((k) => (
            <div key={k.label} className="p-5">
              <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">{k.label}</p>
              <p className="mt-1 text-subheading font-w510 text-paper">
                {k.value}
                {k.detail && (
                  <span className="ml-1.5 text-label font-normal text-fog">{k.detail}</span>
                )}
              </p>
            </div>
          ))}
        </div>
        <div className="p-6">
          <p className="text-[10px] font-w510 uppercase tracking-wide text-ash">
            Member penetration by corridor
          </p>
          <div className="mt-4 space-y-2.5">
            {topNb.map((n) => (
              <div key={n.label} className="flex items-center gap-4">
                <span className="w-44 shrink-0 truncate text-caption text-fog">{n.label}</span>
                <span className="h-2 flex-1 rounded-pills bg-white/[0.04]">
                  <span
                    className="block h-2 rounded-pills bg-iris-violet"
                    style={{ width: `${Math.max(2, n.pct)}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right text-caption text-fog">
                  {n.pct.toFixed(0)}% · {n.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    </Showcase>
  );
}

// ── Network log (changelog analog) ──────────────────────────────────────────

const LOG = [
  {
    date: "Jul 2026",
    title: "Coordinate audit",
    detail: "1,695 exact geocodes verified; centroid-filled locations flagged and excluded from proximity edges.",
  },
  {
    date: "Jul 2026",
    title: "Review-count cleanup",
    detail: "Statistically impossible review counts removed — only verified counts are shown anywhere.",
  },
  {
    date: "Jul 2026",
    title: "Membership tri-state",
    detail: "1,081 businesses with unknown chamber status restored — unknown is never displayed as “not a member.”",
  },
  {
    date: "Queued",
    title: "State-records enrichment",
    detail: "Florida SunBiz registrations and professional licenses join the provenance layer next.",
  },
];

export function NetworkLog() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-24">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-heading-sm font-w510 text-paper">Network log</h2>
        <p className="text-caption text-fog">How the data earns trust</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LOG.map((l) => (
          <div key={l.title} className="rounded-cards bg-carbon p-5 shadow-subtle">
            <p className="font-mono text-label tracking-[-0.013em] text-ash">{l.date}</p>
            <h3 className="mt-2 text-body-sm font-w510 text-paper">{l.title}</h3>
            <p className="mt-1.5 text-caption text-fog">{l.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Statement band (testimonial analog — honest, no fake attribution) ───────

export function StatementBand() {
  const stats = getStats();
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div
          className="flex min-h-[260px] flex-col justify-between rounded-cards p-8"
          style={{ background: "#e3e1f6" }}
        >
          <p className="max-w-md text-subheading font-w510 leading-[1.3] text-void">
            “Owner corrections take priority over every other source. Permanently.”
          </p>
          <p className="mt-8 text-caption font-w510 text-void/60">
            The correction rule — how the network stays true
          </p>
        </div>
        <div className="flex min-h-[260px] flex-col justify-between rounded-cards bg-acid-lime p-8">
          <p className="max-w-xs text-subheading font-w510 leading-[1.3] text-void">
            “Free for owners. Claimed in under two minutes.”
          </p>
          <p className="mt-8 text-caption font-w510 text-void/60">
            The deal — no paywall, no catch
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-caption text-fog">
          CO_ Network maps{" "}
          <span className="font-w510 text-mist">{stats.total.toLocaleString()}</span> businesses
          across Coral Gables — from Miracle Mile to Sunset.
        </p>
        <Link
          href="/directory"
          className="text-caption font-w510 text-mist transition-colors duration-150 hover:text-paper"
        >
          Browse the directory →
        </Link>
      </div>
    </section>
  );
}

// ── Closing CTA ─────────────────────────────────────────────────────────────

export function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-32 text-center">
      <h2 className="text-heading font-w510 text-paper sm:text-heading-lg">
        Already on the map.
        <br />
        Now make it yours.
      </h2>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-pills bg-paper px-5 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85"
        >
          Claim your business
        </Link>
        <Link
          href="/directory"
          className="rounded-pills border border-graphite px-5 py-2.5 text-[14px] font-w510 text-mist transition-colors duration-150 hover:border-smoke hover:bg-white/[0.03]"
        >
          Browse the directory
        </Link>
      </div>
    </section>
  );
}
