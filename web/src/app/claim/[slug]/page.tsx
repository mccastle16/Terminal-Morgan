import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CircleCheck,
  MessageSquareText,
  PencilLine,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getBusinessBySlug, getCategoryLabel } from "@/lib/data";

// Claim flow entry (Week 2 — REBUILD-PLAN D6). The verification steps below
// are the real designed flow (SMS OTP to the number on file, domain email
// fallback, manual review). Submission activates once Supabase auth + Twilio
// Verify are wired; until then this page renders the flow and collects intent.

export const metadata: Metadata = {
  title: "Claim your business — CO_ Network",
};

type Props = { params: Promise<{ slug: string }> };

const STEPS = [
  {
    icon: UserRoundCheck,
    title: "Create a free account",
    detail: "Sign in with your email — takes under a minute.",
  },
  {
    icon: MessageSquareText,
    title: "Verify with a one-time code",
    detail:
      "We text a code to the business phone number already on file. No number listed (or no access to it)? Verify with an email at your business's website domain, or upload a document for manual review.",
  },
  {
    icon: PencilLine,
    title: "Review and correct your data",
    detail:
      "See everything on your profile and where each piece came from. Fix anything that's out of date — your corrections take priority over every other source.",
  },
  {
    icon: CircleCheck,
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href={`/b/${business.slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={14} aria-hidden /> Back to profile
        </Link>

        <div className="flex items-center gap-2 text-amber-400">
          <ShieldCheck size={18} aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Claim your business</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{business.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {getCategoryLabel(business.category_slug)}
          {business.neighborhood_label && ` · ${business.neighborhood_label}`}
        </p>

        <ol className="mt-8 space-y-4">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <s.icon size={17} aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  <span className="mr-1.5 text-slate-500">{i + 1}.</span>
                  {s.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.detail}</p>
                {i === 1 && maskedPhone && (
                  <p className="mt-2 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300">
                    Code will be sent to <span className="font-mono">{maskedPhone}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 text-center">
          <p className="text-sm font-semibold text-slate-100">Claiming opens shortly</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            Account creation and verification are launching now. Want us to hold this profile for
            you and email you the moment it opens? Reach out:
          </p>
          <a
            href={`mailto:hello@co-underscore.com?subject=${encodeURIComponent(
              `Claim request: ${business.name} (${business.slug})`
            )}`}
            className="mt-3 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Request this profile
          </a>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
          Free for business owners. CO_ Network is operated by CO_; verification data is used only
          to confirm ownership and is never used for marketing.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
