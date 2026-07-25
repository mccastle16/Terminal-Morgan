import Link from "next/link";
import type { Metadata } from "next";
import { HeroTerminal } from "@/components/hero-terminal";
import {
  AskTheMarket,
  ClosingCta,
  CornerOfNetwork,
  IntroBand,
  KnowWhereYouStand,
  NetworkLog,
  OwnYourRecord,
  SourceStrip,
  StatementBand,
  WholeMarket,
} from "@/components/landing-sections";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getStats } from "@/lib/data";

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


  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-void">
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
        </section>

        {/* ── Source strip (logo-strip analog) + intro statement ── */}
        <SourceStrip />
        <IntroBand />

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

        {/* ── Product showcases — linear.app anatomy, real product fragments ── */}
        <OwnYourRecord />
        <KnowWhereYouStand />
        <CornerOfNetwork />
        <AskTheMarket />
        <WholeMarket />

        {/* ── Network log + statement band + closing ── */}
        <NetworkLog />
        <StatementBand />
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  );
}
