import Link from "next/link";
import type { Metadata } from "next";
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
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero — sell it, then two clear doors ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-24 sm:pt-32">
          <div className="max-w-3xl">
            <p className="text-label font-medium text-graphite">
              Coral Gables, Florida · {stats.total.toLocaleString()} businesses mapped
            </p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-1.44px] text-obsidian sm:text-display">
              Your business is already on the map. Take control of it.
            </h1>
            <p className="mt-6 max-w-xl text-body-lg font-normal text-graphite">
              CO_ Network is a living map of every business in Coral Gables — who’s here, how
              they connect, and where each one has room to grow. Claim your profile to correct
              your data, see where you stand, and find your next connection. Free for owners.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-obsidian px-7 py-3 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
              >
                Claim your business
              </Link>
              <Link
                href="/directory"
                className="rounded-full border border-hairline px-7 py-3 text-label font-medium text-obsidian transition-shadow duration-200 hover:shadow-sm"
              >
                Browse the directory
              </Link>
              <Link
                href="/app/preview"
                className="rounded-full px-4 py-3 text-label font-medium text-graphite transition-colors duration-200 hover:bg-whisper hover:text-obsidian"
              >
                See a live preview
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <p className="text-label font-medium text-graphite">How it works</p>
          <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title}>
                <p className="text-subheading font-medium text-smoke">{i + 1}</p>
                <h2 className="mt-2 text-subheading font-medium text-obsidian">{step.title}</h2>
                <p className="mt-2 text-body font-normal text-graphite">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What you get ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <p className="text-label font-medium text-graphite">What you get</p>
          <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            <div>
              <h2 className="text-heading font-semibold text-obsidian">
                Your data, on your terms
              </h2>
              <p className="mt-4 max-w-md text-body font-normal text-obsidian">
                Every field on your profile shows where it came from. Fix anything that’s out of
                date — owner corrections take priority over every other source, permanently. No
                more chasing stale listings around the internet.
              </p>
            </div>
            <div className="flex flex-col gap-10">
              <div>
                <h3 className="text-subheading font-medium text-obsidian">
                  Benchmarks against real local peers
                </h3>
                <p className="mt-2 max-w-md text-body font-normal text-graphite">
                  Rating standing, review volume, and digital presence measured against the
                  businesses actually around you — framed as headroom, not judgment.
                </p>
              </div>
              <div>
                <h3 className="text-subheading font-medium text-obsidian">
                  Connections that explain themselves
                </h3>
                <p className="mt-2 max-w-md text-body font-normal text-graphite">
                  Neighbors, peers, and complementary businesses — every suggestion says why it
                  was made, and you decide what sticks.
                </p>
              </div>
              <div>
                <h3 className="text-subheading font-medium text-obsidian">
                  A public page that works for you
                </h3>
                <p className="mt-2 max-w-md text-body font-normal text-graphite">
                  Your verified profile is a clean, findable page in the Coral Gables directory —
                  with your corrections, your confirmed connections, and your standing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Explore ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <p className="text-label font-medium text-graphite">Explore the directory</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/directory?category=${c.slug}`}
                className="rounded-full border border-hairline px-5 py-2 text-label font-medium text-obsidian transition-shadow duration-200 hover:shadow-sm"
              >
                {c.label}
              </Link>
            ))}
            <Link
              href="/directory"
              className="rounded-full px-4 py-2 text-label font-medium text-graphite transition-colors duration-200 hover:bg-whisper hover:text-obsidian"
            >
              All {stats.categories} categories →
            </Link>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 py-20">
          <div className="rounded-cards border border-hairline p-10 text-center sm:p-14">
            <h2 className="mx-auto max-w-xl text-heading font-semibold text-obsidian">
              {stats.total.toLocaleString()} businesses are already mapped. Yours is one of them.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-body font-normal text-graphite">
              Claiming takes two minutes and costs nothing.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-block rounded-full bg-obsidian px-7 py-3 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
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
