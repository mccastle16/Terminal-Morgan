import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, MapPinPlus } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getStats } from "@/lib/data";

// "Add a business that doesn't exist yet" — the second onboarding path
// (REBUILD-PLAN Phase 2 A3). Creates an 'unverified' listing + claim once
// Supabase auth is live; until then, collects intent by email.

export const metadata: Metadata = {
  title: "Add your business — CO_ Network",
};

export default function NewBusinessPage() {
  const stats = getStats();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/directory"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={14} aria-hidden /> Directory
        </Link>

        <div className="flex items-center gap-2 text-amber-400">
          <MapPinPlus size={18} aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Add your business</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Not in the directory yet?</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          We’ve indexed {stats.total.toLocaleString()} Coral Gables businesses from public sources,
          but some — especially newer businesses and office-based professional services — aren’t
          visible in public data. Add yours: you’ll provide the basics (name, category, address,
          phone), verify ownership, and get the same free profile, benchmark, and connection
          suggestions as every claimed business.
        </p>

        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 text-center">
          <p className="text-sm font-semibold text-slate-100">Listing creation opens with accounts</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            Send us the business name and address and we’ll index it and notify you the moment
            claiming opens:
          </p>
          <a
            href="mailto:hello@co-underscore.com?subject=Add%20my%20business%20to%20CO_%20Network"
            className="mt-3 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Add my business
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
