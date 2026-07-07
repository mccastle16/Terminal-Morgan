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
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-10">
        <Link
          href={`/b/${business.slug}`}
          className="rounded-links text-label font-medium text-graphite transition-colors duration-200 hover:text-obsidian"
        >
          ← Back to profile
        </Link>

        <div className="mx-auto mt-10 max-w-2xl">
          <p className="text-label font-medium text-graphite">Claim your business</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-1.2px] text-obsidian sm:text-display">
            {business.name}
          </h1>
          <p className="mt-2 text-label font-normal text-graphite">
            {getCategoryLabel(business.category_slug)}
            {business.neighborhood_label && <> · {business.neighborhood_label}</>}
          </p>

          <ol className="mt-12 divide-y divide-hairline border-t border-hairline">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-6 py-6">
                <span className="w-8 shrink-0 text-subheading font-medium text-smoke">
                  {i + 1}
                </span>
                <div>
                  <p className="text-body-lg font-medium text-obsidian">{s.title}</p>
                  <p className="mt-1.5 max-w-lg text-label font-normal leading-relaxed text-graphite">
                    {s.detail}
                  </p>
                  {i === 1 && maskedPhone && (
                    <p className="mt-3 inline-block rounded-full bg-ash px-4 py-1.5 text-caption font-medium text-obsidian">
                      Code will be sent to {maskedPhone}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-cards border border-hairline p-8 text-center">
            <p className="text-subheading font-medium text-obsidian">Claiming opens shortly</p>
            <p className="mx-auto mt-2 max-w-md text-label font-normal leading-relaxed text-graphite">
              Account creation and verification are launching now. Want us to hold this profile
              for you and email you the moment it opens?
            </p>
            <a
              href={`mailto:hello@co-underscore.com?subject=${encodeURIComponent(
                `Claim request: ${business.name} (${business.slug})`
              )}`}
              className="mt-5 inline-block rounded-full bg-obsidian px-6 py-2.5 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
            >
              Request this profile
            </a>
          </div>

          <p className="mt-8 text-center text-caption font-normal text-smoke">
            Free for business owners. CO_ Network is operated by CO_; verification data is used
            only to confirm ownership and is never used for marketing.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
