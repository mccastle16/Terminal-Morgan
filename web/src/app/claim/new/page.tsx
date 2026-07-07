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
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-10">
        <Link
          href="/directory"
          className="rounded-links text-label font-medium text-graphite transition-colors duration-200 hover:text-obsidian"
        >
          ← Directory
        </Link>

        <div className="mx-auto mt-10 max-w-2xl">
          <p className="text-label font-medium text-graphite">Add your business</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-1.2px] text-obsidian sm:text-display">
            Not in the directory yet?
          </h1>
          <p className="mt-5 max-w-xl text-body font-normal text-obsidian">
            We’ve indexed {stats.total.toLocaleString()} Coral Gables businesses from public
            sources, but some — especially newer businesses and office-based professional
            services — aren’t visible in public data. Add yours: you’ll provide the basics
            (name, category, address, phone), verify ownership, and get the same free profile,
            benchmark, and connection suggestions as every claimed business.
          </p>

          <div className="mt-12 rounded-cards border border-hairline p-8 text-center">
            <p className="text-subheading font-medium text-obsidian">
              Listing creation opens with accounts
            </p>
            <p className="mx-auto mt-2 max-w-md text-label font-normal leading-relaxed text-graphite">
              Send us the business name and address and we’ll index it and notify you the moment
              claiming opens.
            </p>
            <a
              href="mailto:hello@co-underscore.com?subject=Add%20my%20business%20to%20CO_%20Network"
              className="mt-5 inline-block rounded-full bg-obsidian px-6 py-2.5 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
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
