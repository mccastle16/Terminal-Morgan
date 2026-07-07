import Link from "next/link";
import type { Metadata } from "next";
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
    <div className="flex min-h-screen flex-col bg-void">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-10">
        <Link
          href="/directory"
          className="cursor-pointer rounded-buttons px-2 py-1 text-caption font-normal text-fog transition-colors duration-150 hover:bg-white/[0.03] hover:text-mist"
        >
          ← Directory
        </Link>

        <div className="mx-auto mt-10 max-w-2xl">
          <p className="text-label font-w510 uppercase tracking-wide text-ash">
            Add your business
          </p>
          <h1 className="mt-2 text-heading-sm font-w510 text-paper sm:text-heading">
            Not in the directory yet?
          </h1>
          <p className="mt-5 max-w-xl text-body-sm font-normal text-mist">
            We’ve indexed {stats.total.toLocaleString()} Coral Gables businesses from public
            sources, but some — especially newer businesses and office-based professional
            services — aren’t visible in public data. Add yours: you’ll provide the basics
            (name, category, address, phone), verify ownership, and get the same free profile,
            benchmark, and connection suggestions as every claimed business.
          </p>

          {/* The page's single acid-lime action */}
          <div className="mt-12 rounded-cards bg-carbon p-8 shadow-subtle">
            <p className="text-body-lg font-w510 text-paper">
              Listing creation opens with accounts
            </p>
            <p className="mt-2 max-w-md text-caption font-normal leading-relaxed text-fog">
              Send us the business name and address and we’ll index it and notify you the moment
              claiming opens.
            </p>
            <a
              href="mailto:hello@co-underscore.com?subject=Add%20my%20business%20to%20CO_%20Network"
              className="mt-5 inline-flex cursor-pointer items-center rounded-buttons bg-acid-lime px-4 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85"
            >
              Add my business
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
