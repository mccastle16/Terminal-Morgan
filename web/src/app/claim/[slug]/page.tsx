import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getBusinessBySlug, getCategoryLabel } from "@/lib/data";

// Claim flow entry (Week 2 — REBUILD-PLAN D6). The steps below are the real
// designed flow (SMS OTP to the number on file, domain email fallback, manual
// review). Submission activates once Supabase auth + Twilio Verify are wired;
// until then this page renders the flow and collects intent.

export const metadata: Metadata = {
  title: "Claim your business — CO_ Network",
};

type Props = { params: Promise<{ slug: string }> };

const STEPS = [
  {
    title: "Create a free account",
    detail: "Sign in with your email — takes under a minute.",
  },
  {
    title: "Verify with a one-time code",
    detail:
      "We text a code to the business phone number already on file. No number listed (or no access to it)? Verify with an email at your business's website domain, or upload a document for manual review.",
  },
  {
    title: "Review and correct your data",
    detail:
      "See everything on your profile and where each piece came from. Fix anything that's out of date — your corrections take priority over every other source.",
  },
  {
    title: "Unlock your full profile",
    detail:
      "Full market benchmark, a free digital-presence report, and suggested connections to nearby and complementary businesses.",
  },
];

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params;
  const business = getBusinessBySlug(slug);
  if (!business) notFound();

  const maskedPhone = business.phone
    ? business.phone.replace(/\d(?=[\d\s\-()]*\d{2}$)/g, "•")
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-void">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-10">
        <Link
          href={`/b/${business.slug}`}
          className="cursor-pointer rounded-buttons px-2 py-1 text-caption font-normal text-fog transition-colors duration-150 hover:bg-white/[0.03] hover:text-mist"
        >
          ← Back to profile
        </Link>

        <div className="mx-auto mt-10 max-w-2xl">
          <p className="text-label font-w510 uppercase tracking-wide text-ash">
            Claim your business
          </p>
          <h1 className="mt-2 text-heading-sm font-w510 text-paper sm:text-heading">
            {business.name}
          </h1>
          <p className="mt-2 text-caption font-normal text-fog">
            {getCategoryLabel(business.category_slug)}
            {business.neighborhood_label && <> · {business.neighborhood_label}</>}
          </p>

          <ol className="mt-12 divide-y divide-graphite border-t border-graphite">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-6 py-6">
                <span className="w-8 shrink-0 text-subheading font-w510 text-ash">
                  {i + 1}
                </span>
                <div>
                  <p className="text-body-lg font-w510 text-paper">{s.title}</p>
                  <p className="mt-1.5 max-w-lg text-caption font-normal leading-relaxed text-fog">
                    {s.detail}
                  </p>
                  {i === 1 && maskedPhone && (
                    <p className="mt-3 inline-block rounded-badges bg-white/5 px-1.5 py-px font-mono text-label tracking-[-0.013em] text-fog">
                      Code will be sent to {maskedPhone}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* The page's single acid-lime action */}
          <div className="mt-12 rounded-cards bg-carbon p-8 shadow-subtle">
            <p className="text-body-lg font-w510 text-paper">Claiming opens shortly</p>
            <p className="mt-2 max-w-md text-caption font-normal leading-relaxed text-fog">
              Account creation and verification are launching now. Want us to hold this profile
              for you and email you the moment it opens?
            </p>
            <a
              href={`mailto:hello@co-underscore.com?subject=${encodeURIComponent(
                `Claim request: ${business.name} (${business.slug})`
              )}`}
              className="mt-5 inline-flex cursor-pointer items-center rounded-buttons bg-acid-lime px-4 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85"
            >
              Request this profile
            </a>
          </div>

          <p className="mt-8 text-label font-normal text-ash">
            Free for business owners. CO_ Network is operated by CO_; verification data is used
            only to confirm ownership and is never used for marketing.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
