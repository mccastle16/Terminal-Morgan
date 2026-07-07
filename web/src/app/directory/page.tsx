import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { BusinessList } from "@/components/business-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getCategories, getNeighborhoods, getStats, searchBusinesses } from "@/lib/data";

export const metadata: Metadata = {
  title: "Coral Gables Business Directory — CO_ Network",
  description:
    "Every business in Coral Gables, mapped: search 2,700+ local businesses by category and neighborhood, and claim your own profile.",
};

type Props = {
  searchParams: Promise<{ q?: string; category?: string; neighborhood?: string; page?: string }>;
};

function buildQuery(
  base: { q?: string; category?: string; neighborhood?: string },
  overrides: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function DirectoryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = { q: sp.q, category: sp.category, neighborhood: sp.neighborhood };
  const result = searchBusinesses({ ...filters, page: Number(sp.page ?? 1) });
  const categories = getCategories();
  const neighborhoods = getNeighborhoods();
  const stats = getStats();

  return (
    <div className="flex min-h-screen flex-col bg-void">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-12">
        <h1 className="text-heading-sm font-w510 text-paper">Directory</h1>
        <p className="mt-2 text-body-sm font-normal text-fog">
          {stats.total.toLocaleString()} businesses across {stats.neighborhoods} neighborhoods —
          find yours and claim it.
        </p>

        {/* Search + filters — GET form, no JS required */}
        <form method="GET" className="mt-8 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search
              size={16}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fog"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search by name, category, or address…"
              aria-label="Search businesses"
              className="w-full rounded-inputs border border-white/[0.08] bg-white/[0.02] py-3 pl-10 pr-3.5 text-[14px] text-mist outline-none placeholder:text-fog focus:border-mist"
            />
          </label>
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            aria-label="Filter by category"
            className="cursor-pointer rounded-inputs border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[14px] text-mist outline-none focus:border-mist"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
          <select
            name="neighborhood"
            defaultValue={sp.neighborhood ?? ""}
            aria-label="Filter by neighborhood"
            className="cursor-pointer rounded-inputs border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[14px] text-mist outline-none focus:border-mist"
          >
            <option value="">All neighborhoods</option>
            {neighborhoods.map((n) => (
              <option key={n.label} value={n.label}>
                {n.label} ({n.count})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="cursor-pointer rounded-buttons bg-paper px-4 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85"
          >
            Search
          </button>
        </form>

        <div className="mt-10 flex items-baseline justify-between">
          <p className="text-caption font-normal text-fog">
            {result.total.toLocaleString()} result{result.total === 1 ? "" : "s"}
            {sp.q && <> for “{sp.q}”</>}
          </p>
          {(sp.q || sp.category || sp.neighborhood) && (
            <Link
              href="/directory"
              className="cursor-pointer rounded-buttons px-2 py-1 text-caption font-normal text-mist transition-colors duration-150 hover:bg-white/[0.03]"
            >
              Clear filters
            </Link>
          )}
        </div>

        {result.items.length === 0 ? (
          <div className="mt-6 border-t border-graphite pt-10">
            <p className="text-body-lg font-w510 text-paper">
              No businesses match that search.
            </p>
            <p className="mt-2 max-w-md text-body-sm font-normal text-fog">
              Can’t find your business? It may not be indexed yet —{" "}
              <Link
                href="/claim/new"
                className="text-mist underline decoration-graphite underline-offset-4 hover:decoration-mist"
              >
                add it to the network
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-2 border-t border-graphite">
            <BusinessList items={result.items} />
          </div>
        )}

        {/* Pagination — ghost text controls */}
        {result.pages > 1 && (
          <nav
            className="mt-10 flex items-center justify-center gap-6 text-caption"
            aria-label="Pagination"
          >
            {result.page > 1 ? (
              <Link
                href={`/directory${buildQuery(filters, { page: String(result.page - 1) })}`}
                className="cursor-pointer rounded-buttons px-3 py-1.5 text-mist transition-colors duration-150 hover:bg-white/[0.03]"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-ash">← Previous</span>
            )}
            <span className="font-normal text-fog">
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages ? (
              <Link
                href={`/directory${buildQuery(filters, { page: String(result.page + 1) })}`}
                className="cursor-pointer rounded-buttons px-3 py-1.5 text-mist transition-colors duration-150 hover:bg-white/[0.03]"
              >
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-ash">Next →</span>
            )}
          </nav>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
