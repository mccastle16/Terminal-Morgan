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
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-12">
        <h1 className="text-heading font-semibold text-obsidian">Directory</h1>
        <p className="mt-1 text-body font-normal text-graphite">
          {stats.total.toLocaleString()} businesses across {stats.neighborhoods} neighborhoods —
          find yours and claim it.
        </p>

        {/* Search + filters — pill inputs, GET form, no JS required */}
        <form method="GET" className="mt-8 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search
              size={16}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-obsidian"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search by name, category, or address…"
              aria-label="Search businesses"
              className="w-full rounded-full border border-hairline bg-transparent py-2.5 pl-12 pr-6 text-input font-normal text-obsidian outline-none placeholder:text-graphite"
            />
          </label>
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            aria-label="Filter by category"
            className="cursor-pointer rounded-full border border-hairline bg-transparent px-5 py-2.5 text-label font-medium text-obsidian outline-none"
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
            className="cursor-pointer rounded-full border border-hairline bg-transparent px-5 py-2.5 text-label font-medium text-obsidian outline-none"
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
            className="cursor-pointer rounded-full bg-obsidian px-6 py-2.5 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
          >
            Search
          </button>
        </form>

        <div className="mt-10 flex items-baseline justify-between">
          <p className="text-label font-medium text-graphite">
            {result.total.toLocaleString()} result{result.total === 1 ? "" : "s"}
            {sp.q && <> for “{sp.q}”</>}
          </p>
          {(sp.q || sp.category || sp.neighborhood) && (
            <Link
              href="/directory"
              className="rounded-links text-label font-medium text-obsidian transition-colors duration-200 hover:text-graphite"
            >
              Clear filters
            </Link>
          )}
        </div>

        {result.items.length === 0 ? (
          <div className="mt-6 border-t border-hairline pt-10">
            <p className="text-body-lg font-medium text-obsidian">
              No businesses match that search.
            </p>
            <p className="mt-2 max-w-md text-body font-normal text-graphite">
              Can’t find your business? It may not be indexed yet —{" "}
              <Link
                href="/claim/new"
                className="rounded-links font-medium text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
              >
                add it to the network
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-2 border-t border-hairline">
            <BusinessList items={result.items} />
          </div>
        )}

        {/* Pagination — ghost text controls */}
        {result.pages > 1 && (
          <nav
            className="mt-10 flex items-center justify-center gap-6 text-label font-medium"
            aria-label="Pagination"
          >
            {result.page > 1 ? (
              <Link
                href={`/directory${buildQuery(filters, { page: String(result.page - 1) })}`}
                className="rounded-full px-4 py-1.5 text-obsidian transition-colors duration-200 hover:bg-whisper"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-4 py-1.5 text-smoke">← Previous</span>
            )}
            <span className="font-normal text-graphite">
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages ? (
              <Link
                href={`/directory${buildQuery(filters, { page: String(result.page + 1) })}`}
                className="rounded-full px-4 py-1.5 text-obsidian transition-colors duration-200 hover:bg-whisper"
              >
                Next →
              </Link>
            ) : (
              <span className="px-4 py-1.5 text-smoke">Next →</span>
            )}
          </nav>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
