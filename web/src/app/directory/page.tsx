import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { BusinessCard } from "@/components/business-card";
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Coral Gables Business Directory
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {stats.total.toLocaleString()} businesses across {stats.neighborhoods} neighborhoods —
            find yours and claim it.
          </p>
        </div>

        {/* Search + filters (GET form — works without JS, server-rendered) */}
        <form method="GET" className="mb-6 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search by name, category, or address…"
              aria-label="Search businesses"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </label>
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            aria-label="Filter by category"
            className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500/60 focus:outline-none"
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
            className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500/60 focus:outline-none"
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
            className="cursor-pointer rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Search
          </button>
        </form>

        {/* Result count + active-filter reset */}
        <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            {result.total.toLocaleString()} result{result.total === 1 ? "" : "s"}
            {sp.q && (
              <>
                {" "}for <span className="font-medium text-slate-200">“{sp.q}”</span>
              </>
            )}
          </p>
          {(sp.q || sp.category || sp.neighborhood) && (
            <Link href="/directory" className="text-amber-400 transition-colors hover:text-amber-300">
              Clear filters
            </Link>
          )}
        </div>

        {result.items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="font-medium text-slate-200">No businesses match that search.</p>
            <p className="mt-2 text-sm text-slate-400">
              Can’t find your business? It may not be indexed yet —{" "}
              <Link href="/claim/new" className="text-amber-400 hover:text-amber-300">
                add it to the network
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {result.pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
            {result.page > 1 ? (
              <Link
                href={`/directory${buildQuery(filters, { page: String(result.page - 1) })}`}
                className="flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
              >
                <ChevronLeft size={14} aria-hidden /> Previous
              </Link>
            ) : (
              <span className="flex items-center gap-1 rounded-lg border border-slate-900 px-3 py-1.5 text-slate-700">
                <ChevronLeft size={14} aria-hidden /> Previous
              </span>
            )}
            <span className="text-slate-500">
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages ? (
              <Link
                href={`/directory${buildQuery(filters, { page: String(result.page + 1) })}`}
                className="flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
              >
                Next <ChevronRight size={14} aria-hidden />
              </Link>
            ) : (
              <span className="flex items-center gap-1 rounded-lg border border-slate-900 px-3 py-1.5 text-slate-700">
                Next <ChevronRight size={14} aria-hidden />
              </span>
            )}
          </nav>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
