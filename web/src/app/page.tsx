import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Handshake, ShieldCheck, TrendingUp } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getCategories, getStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "CO_ Network — Every business in Coral Gables, mapped",
  description:
    "A relationship network for the Coral Gables business ecosystem. Claim your business, correct your data, see how you stand, and find the connections that matter.",
};

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Own your data",
    detail:
      "Your profile already exists — assembled from public sources. Claim it, see exactly what's known, and correct anything out of date. Owner corrections beat every other source.",
  },
  {
    icon: TrendingUp,
    title: "Know where you stand",
    detail:
      "Benchmarks against your real local peers — rating standing, review volume, digital presence — framed as headroom, not judgment.",
  },
  {
    icon: Handshake,
    title: "Find the right connections",
    detail:
      "Neighbors, complementary services, referral partners. Every suggestion explains why it was made, and you decide what sticks.",
  },
];

export default function Home() {
  const stats = getStats();
  const topCategories = getCategories().slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Coral Gables, Florida
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Every business in Coral Gables, mapped.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            {stats.total.toLocaleString()} local businesses. One living network of who’s here, how
            they connect, and where each one has room to grow. Yours is already on it.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/directory"
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
            >
              Find your business <ArrowRight size={15} aria-hidden />
            </Link>
            <Link
              href="/directory"
              className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"
            >
              Browse the directory
            </Link>
          </div>

          {/* Stats strip */}
          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
            {[
              [stats.total.toLocaleString(), "businesses indexed"],
              [String(stats.categories), "categories"],
              [String(stats.neighborhoods), "neighborhoods"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <dt className="sr-only">{l}</dt>
                <dd className="text-2xl font-bold text-amber-400">{v}</dd>
                <dd className="mt-1 text-xs text-slate-500">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Pillars */}
        <section className="border-t border-slate-800/70 bg-slate-900/30 py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <p.icon size={19} aria-hidden />
                </div>
                <h2 className="mt-4 text-base font-bold">{p.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Category shortcuts */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-lg font-bold">Explore by category</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {topCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/directory?category=${c.slug}`}
                className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-400"
              >
                {c.label} <span className="text-slate-600">{c.count}</span>
              </Link>
            ))}
            <Link
              href="/directory"
              className="rounded-full px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
            >
              All categories →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
