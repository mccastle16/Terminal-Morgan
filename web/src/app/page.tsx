import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getCategories, getStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "CO_ Network — Every business in Coral Gables, mapped",
  description:
    "A relationship network for the Coral Gables business ecosystem. Claim your business, correct your data, see how you stand, and find the connections that matter.",
};

// DESIGN.md hero model: a vertically centered prompt interaction on an empty
// white canvas — the search input IS the first screen. Below, content flows
// in editorial 2-column compositions separated by whitespace alone.
export default function Home() {
  const stats = getStats();
  const topCategories = getCategories().slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero: the command line ── */}
        <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 pb-20 pt-28 text-center sm:pt-36">
          <h1 className="max-w-2xl text-4xl font-medium tracking-[-1.44px] text-obsidian sm:text-display">
            Every business in Coral Gables, mapped.
          </h1>

          <form method="GET" action="/directory" className="mt-10 w-full max-w-xl">
            <label className="relative block">
              <Search
                size={18}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-obsidian"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                placeholder="Search for your business…"
                aria-label="Search businesses"
                className="w-full rounded-full border border-hairline bg-transparent py-3 pl-[52px] pr-6 text-input font-normal text-obsidian outline-none placeholder:text-graphite"
              />
            </label>
          </form>

          {/* Tag chip row — outlined pills, 8px apart */}
          <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
            {topCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/directory?category=${c.slug}`}
                className="rounded-full border border-hairline px-5 py-2 text-label font-medium text-obsidian transition-shadow duration-200 hover:shadow-sm"
              >
                {c.label}
              </Link>
            ))}
          </div>

          <p className="mt-12 text-label font-normal text-graphite">
            {stats.total.toLocaleString()} businesses · {stats.categories} categories ·{" "}
            {stats.neighborhoods} neighborhoods
          </p>
        </section>

        {/* ── What it is — 2-column editorial ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <p className="text-label font-medium text-graphite">The network</p>
          <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            <div>
              <h2 className="text-heading font-semibold text-obsidian">
                Your profile already exists. Own it.
              </h2>
              <p className="mt-4 max-w-md text-body font-normal text-obsidian">
                We assembled a living map of the Coral Gables business ecosystem from public
                sources — who’s here, how they relate, and where each business has room to grow.
                Claim yours to see exactly what’s known about it and correct anything that’s out
                of date. Owner corrections take priority over every other source.
              </p>
            </div>
            <div className="flex flex-col gap-10">
              <div>
                <h3 className="text-subheading font-medium text-obsidian">
                  Know where you stand
                </h3>
                <p className="mt-2 max-w-md text-body font-normal text-graphite">
                  Benchmarks against your real local peers — rating standing, review volume,
                  digital presence — framed as headroom, not judgment.
                </p>
              </div>
              <div>
                <h3 className="text-subheading font-medium text-obsidian">
                  Find the right connections
                </h3>
                <p className="mt-2 max-w-md text-body font-normal text-graphite">
                  Neighbors, complementary services, referral partners. Every suggestion explains
                  why it was made, and you decide what sticks.
                </p>
              </div>
              <div>
                <h3 className="text-subheading font-medium text-obsidian">Free for owners</h3>
                <p className="mt-2 max-w-md text-body font-normal text-graphite">
                  Claiming, correcting, and benchmarking cost nothing. Verification takes a
                  one-time code sent to the phone number already on file.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
