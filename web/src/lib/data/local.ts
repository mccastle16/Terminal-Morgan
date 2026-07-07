// Local data provider — reads the public-safe snapshot emitted by
// scripts/emit_local_snapshot.py. Server-side only (imported from Server
// Components); the full dataset is never shipped to the client.
//
// When the Supabase project exists, a supabase.ts provider implements the
// same functions with PostgREST queries and this file stops being imported
// (see index.ts). IDs, slugs, and semantics are already identical.

import businessesJson from "@/data/businesses.json";
import categoriesJson from "@/data/categories.json";
import neighborhoodsJson from "@/data/neighborhoods.json";
import type {
  Benchmark,
  Business,
  Category,
  Connection,
  Neighborhood,
  SearchParams,
  SearchResult,
} from "./types";

const businesses = businessesJson as Business[];
const categories = categoriesJson as Category[];
const neighborhoods = neighborhoodsJson as Neighborhood[];

const bySlug = new Map(businesses.map((b) => [b.slug, b]));
const categoryLabel = new Map(categories.map((c) => [c.slug, c.label]));

// ── Basics ───────────────────────────────────────────────────────────────────

export function getCategories(): (Category & { count: number })[] {
  const counts = new Map<string, number>();
  for (const b of businesses) {
    counts.set(b.category_slug, (counts.get(b.category_slug) ?? 0) + 1);
  }
  return categories
    .map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

export function getNeighborhoods(): (Neighborhood & { count: number })[] {
  const counts = new Map<string, number>();
  for (const b of businesses) {
    if (b.neighborhood_label) {
      counts.set(b.neighborhood_label, (counts.get(b.neighborhood_label) ?? 0) + 1);
    }
  }
  return neighborhoods
    .map((n) => ({ ...n, count: counts.get(n.label) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

export function getCategoryLabel(slug: string): string {
  return categoryLabel.get(slug) ?? slug;
}

export function getStats() {
  return {
    total: businesses.length,
    members: businesses.filter((b) => b.chamber_member === true).length,
    categories: categories.length,
    neighborhoods: neighborhoods.length,
  };
}

// ── Search ───────────────────────────────────────────────────────────────────

export function searchBusinesses(params: SearchParams): SearchResult {
  const q = (params.q ?? "").trim().toLowerCase();
  const perPage = params.perPage ?? 24;

  let items = businesses;
  if (params.category) {
    items = items.filter((b) => b.category_slug === params.category);
  }
  if (params.neighborhood) {
    items = items.filter((b) => b.neighborhood_label === params.neighborhood);
  }
  if (q) {
    items = items.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.address ?? "").toLowerCase().includes(q) ||
        getCategoryLabel(b.category_slug).toLowerCase().includes(q)
    );
  }

  // rated-and-reviewed first, then alphabetical — a stable, defensible order
  items = [...items].sort((a, b) => {
    const ar = (a.rating ?? 0) * Math.min(a.review_count ?? 0, 50);
    const br = (b.rating ?? 0) * Math.min(b.review_count ?? 0, 50);
    if (br !== ar) return br - ar;
    return a.name.localeCompare(b.name);
  });

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, params.page ?? 1), pages);
  return { items: items.slice((page - 1) * perPage, page * perPage), total, page, pages };
}

export function getBusinessBySlug(slug: string): Business | null {
  return bySlug.get(slug) ?? null;
}

// ── Connections (deterministic edges, computed per request) ─────────────────

function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Businesses within `radiusM`, closest first — the NEAR edge.
 *  Exact geocodes only: approximate (centroid) coords stack hundreds of
 *  businesses on one point and would make everything "0 m away". */
export function getNearby(b: Business, radiusM = 200, limit = 6): Connection[] {
  if (b.lat == null || b.lon == null || b.location_precision !== "exact") return [];
  const out: Connection[] = [];
  for (const other of businesses) {
    if (other.id === b.id || other.lat == null || other.lon == null) continue;
    if (other.location_precision !== "exact") continue;
    const d = haversineM(b.lat, b.lon, other.lat, other.lon);
    if (d <= radiusM) {
      out.push({
        business: other,
        reason: d < 15 ? "same address" : `${Math.round(d)} m away`,
        distanceM: Math.round(d),
      });
    }
  }
  return out.sort((a, z) => (a.distanceM ?? 0) - (z.distanceM ?? 0)).slice(0, limit);
}

/** Same category + geographic overlap — the COMPETES_WITH edge, presented
 *  neutrally as "similar businesses" on public pages. */
export function getSimilar(b: Business, limit = 6): Connection[] {
  const out: Connection[] = [];
  for (const other of businesses) {
    if (other.id === b.id || other.category_slug !== b.category_slug) continue;
    let d: number | null = null;
    const bothExact =
      b.location_precision === "exact" && other.location_precision === "exact";
    if (bothExact && b.lat != null && b.lon != null && other.lat != null && other.lon != null) {
      d = haversineM(b.lat, b.lon, other.lat, other.lon);
      if (d > 1000) continue;
    } else if (
      !b.neighborhood_label ||
      b.neighborhood_label !== other.neighborhood_label ||
      b.neighborhood_label === "Coral Gables" // catch-all — too vague to imply proximity
    ) {
      continue;
    }
    out.push({
      business: other,
      reason:
        d != null
          ? d < 15
            ? "same category, same address"
            : `same category, ${d < 950 ? `${Math.round(d)} m` : "~1 km"} away`
          : `same category in ${b.neighborhood_label}`,
      distanceM: d != null ? Math.round(d) : null,
    });
  }
  return out
    .sort((a, z) => (z.business.rating ?? 0) - (a.business.rating ?? 0))
    .slice(0, limit);
}

// ── Benchmarks (constructive framing only — D10) ────────────────────────────

export function getBenchmark(b: Business): Benchmark {
  const peers = businesses.filter(
    (p) => p.category_slug === b.category_slug && p.id !== b.id
  );
  const rated = peers.filter((p) => p.rating != null);

  let ratingPercentile: number | null = null;
  let categoryAvgRating: number | null = null;
  if (rated.length >= 5 && b.rating != null) {
    // share of rated peers this business meets or beats (min-cell >= 5)
    const beaten = rated.filter((p) => (p.rating as number) <= (b.rating as number)).length;
    ratingPercentile = Math.round((beaten / rated.length) * 100);
    categoryAvgRating =
      Math.round((rated.reduce((s, p) => s + (p.rating as number), 0) / rated.length) * 10) / 10;
  }

  const reviewCounts = peers
    .map((p) => p.review_count)
    .filter((n): n is number => n != null)
    .sort((a, z) => a - z);
  const categoryMedianReviews =
    reviewCounts.length >= 5 ? reviewCounts[Math.floor(reviewCounts.length / 2)] : null;

  // Opportunity framing: factors with headroom, never deficiency language.
  const opportunities: Benchmark["opportunities"] = [];
  if (!b.website) {
    opportunities.push({
      title: "A website is the biggest untapped channel",
      detail:
        "Businesses in the directory with a website are dramatically easier to find and connect with. Claiming this profile is a fast first step.",
    });
  }
  if (
    b.review_count != null &&
    categoryMedianReviews != null &&
    b.review_count < categoryMedianReviews
  ) {
    opportunities.push({
      title: "Room to grow review volume",
      detail: `The typical ${getCategoryLabel(b.category_slug).toLowerCase()} business here has ${categoryMedianReviews}+ reviews — more reviews compound visibility.`,
    });
  }
  if (b.rating == null) {
    opportunities.push({
      title: "No public rating yet",
      detail:
        "A visible rating is the single strongest trust signal in local search. Getting listed and reviewed unlocks it.",
    });
  }
  if (!b.phone) {
    opportunities.push({
      title: "Add a phone number",
      detail: "A listed phone number makes the business reachable — and enables instant profile verification.",
    });
  }

  return {
    categoryLabel: getCategoryLabel(b.category_slug),
    ratedPeers: rated.length,
    ratingPercentile,
    categoryAvgRating,
    categoryMedianReviews,
    opportunities: opportunities.slice(0, 3),
  };
}
