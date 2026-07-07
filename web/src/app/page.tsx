import Link from "next/link";
import type { Metadata } from "next";
import { HeroTerminal } from "@/components/hero-terminal";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getCategories, getStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "CO_ Network — Every business in Coral Gables, mapped",
  description:
    "A relationship network for the Coral Gables business ecosystem. Claim your business, correct your data, see how you stand, and find the connections that matter.",
};

const HOW_IT_WORKS = [
  {
    title: "Find your business",
    detail:
      "It's almost certainly already here — we've mapped the Coral Gables ecosystem from public sources. Search the directory and open your profile.",
  },
  {
    title: "Claim and verify it",
    detail:
      "Create a free account and confirm ownership with a one-time code sent to the phone number already on file. Under two minutes.",
  },
  {
    title: "Own your presence",
    detail:
      "See everything the network knows, correct what's wrong, benchmark against your real local peers, and confirm the connections that matter.",
  },
];

export default function Home() {
  const stats = getStats();
  const topCategories = getCategories().slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-void">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero — left-aligned display type, one acid-lime action ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 pt-24">
          <div className="max-w-3xl">
            <p className="text-caption font-normal text-fog">
              Coral Gables, Florida · {stats.total.toLocaleString()} businesses mapped
            </p>
            <h1 className="mt-4 text-heading font-w510 text-paper sm:text-heading-lg">
              Your business is already on the map. Take control of it.
            </h1>
            <p className="mt-6 max-w-xl text-body-lg font-normal text-fog">
              CO_ Network is a living map of every business in Coral Gables — who’s here, how
              they connect, and where each one has room to grow. Claim your profile to correct
              your data, see where you stand, and find your next connection. Free for owners.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex cursor-pointer items-center justify-center rounded-buttons bg-acid-lime px-4 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85"
              >
                Claim your business
              </Link>
              <Link
                href="/directory"
                className="inline-flex cursor-pointer items-center justify-center rounded-buttons border border-graphite px-3 py-2 text-caption text-mist transition-colors duration-150 hover:border-smoke hover:bg-white/[0.03]"
              >
                Browse the directory →
              </Link>
              <Link
                href="/app/preview?role=member"
                className="cursor-pointer rounded-buttons px-3 py-2 text-caption font-normal text-fog transition-colors duration-150 hover:bg-white/[0.03] hover:text-mist"
              >
                See a live preview
              </Link>
            </div>
          </div>

          {/* The hero IS the app — live-data terminal replica on the gradient bleed */}
          <HeroTerminal />

          {/* Stats strip — quiet text */}
          <p className="mt-10 text-caption font-normal text-fog">
            {stats.total.toLocaleString()} businesses
            <span className="mx-2 text-ash">·</span>
            {stats.categories} categories
            <span className="mx-2 text-ash">·</span>
            {stats.neighborhoods} neighborhoods
          </p>
        </section>

        {/* ── How it works — heading left, steps right ── */}
        <section id="how-it-works" className="mx-auto w-full max-w-[1200px] scroll-mt-16 px-6 py-24">
          <div className="grid grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-label font-w510 uppercase tracking-wide text-ash">
                How it works
              </p>
              <h2 className="mt-2 text-heading-sm font-w510 text-paper">
                Claimed in under two minutes.
              </h2>
            </div>
            <ol className="divide-y divide-graphite">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="flex gap-6 py-6 first:pt-0 last:pb-0">
                  <span className="w-8 shrink-0 text-subheading font-w510 text-ash">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-body-lg font-w510 text-paper">{step.title}</h3>
                    <p className="mt-2 max-w-lg text-body-sm font-normal text-fog">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── What you get — heading left, copy right ── */}
        <section id="features" className="mx-auto w-full max-w-[1200px] scroll-mt-16 px-6 py-24">
          <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            <div>
              <p className="text-label font-w510 uppercase tracking-wide text-ash">
                What you get
              </p>
              <h2 className="mt-2 text-heading-sm font-w510 text-paper">
                Your data, on your terms
              </h2>
              <p className="mt-4 max-w-md text-body font-normal text-mist">
                Every field on your profile shows where it came from. Fix anything that’s out of
                date — owner corrections take priority over every other source, permanently. No
                more chasing stale listings around the internet.
              </p>
            </div>
            <div className="flex flex-col divide-y divide-graphite">
              <div className="pb-8">
                <h3 className="text-body-lg font-w510 text-paper">
                  Benchmarks against real local peers
                </h3>
                <p className="mt-2 max-w-md text-body-sm font-normal text-fog">
                  Rating standing, review volume, and digital presence measured against the
                  businesses actually around you — framed as headroom, not judgment.
                </p>
              </div>
              <div className="py-8">
                <h3 className="text-body-lg font-w510 text-paper">
                  Connections that explain themselves
                </h3>
                <p className="mt-2 max-w-md text-body-sm font-normal text-fog">
                  Neighbors, peers, and complementary businesses — every suggestion says why it
                  was made, and you decide what sticks.
                </p>
              </div>
              <div className="pt-8">
                <h3 className="text-body-lg font-w510 text-paper">
                  A public page that works for you
                </h3>
                <p className="mt-2 max-w-md text-body-sm font-normal text-fog">
                  Your verified profile is a clean, findable page in the Coral Gables directory —
                  with your corrections, your confirmed connections, and your standing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Explore — category chips ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 py-24">
          <p className="text-label font-w510 uppercase tracking-wide text-ash">
            Explore the directory
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {topCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/directory?category=${c.slug}`}
                className="inline-flex cursor-pointer items-center rounded-pills bg-white/5 px-3 py-1 text-caption text-mist transition-colors duration-150 hover:bg-white/10"
              >
                {c.label}
              </Link>
            ))}
            <Link
              href="/directory"
              className="cursor-pointer rounded-buttons px-3 py-1.5 text-caption font-normal text-fog transition-colors duration-150 hover:bg-white/[0.03] hover:text-mist"
            >
              All {stats.categories} categories →
            </Link>
          </div>
        </section>

        {/* ── Closing CTA — white pill; the acid-lime already spent on the hero ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 pb-24">
          <div className="rounded-cards bg-carbon p-10 shadow-subtle sm:p-14">
            <h2 className="max-w-xl text-heading-sm font-w510 text-paper">
              {stats.total.toLocaleString()} businesses are already mapped. Yours is one of them.
            </h2>
            <p className="mt-3 max-w-md text-body-sm font-normal text-fog">
              Claiming takes two minutes and costs nothing.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex cursor-pointer items-center rounded-pills bg-paper px-4 py-2 text-caption font-w510 text-void transition-opacity duration-150 hover:opacity-85"
            >
              Claim your business
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
