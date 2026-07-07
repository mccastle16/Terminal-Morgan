// Shared types for the data layer. Field names mirror the Supabase schema
// (supabase/migrations/0001_core_schema.sql) so the local provider can be
// swapped for a Supabase provider without touching any page.

export type Business = {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  category_secondary: string | null;
  neighborhood_label: string | null;
  address: string | null;
  postcode: string | null;
  phone: string | null;
  website: string | null;
  price_tier: "$" | "$$" | "$$$" | "$$$$" | null;
  price_tier_inferred: boolean;
  rating: number | null;
  /** Real review counts only — inferred/fabricated counts are stripped at
   *  snapshot time (77% of the raw CSV's counts were category medians). */
  review_count: number | null;
  /** TRI-STATE: true = verified member list, false = confirmed non-member,
   *  null = unknown. Never render null as "not a member". */
  chamber_member: boolean | null;
  status: "active" | "closed" | "unverified";
  lat: number | null;
  lon: number | null;
  /** 'exact' = real per-business geocode; 'approximate' = postcode/area
   *  centroid (hundreds of businesses share one point) — never use for
   *  distance math. */
  location_precision: "exact" | "approximate" | null;
};

export type Category = { slug: string; label: string; high_value: boolean };
export type Neighborhood = { label: string; is_catchall: boolean };

export type SearchParams = {
  q?: string;
  category?: string;
  neighborhood?: string;
  page?: number;
  perPage?: number;
};

export type SearchResult = {
  items: Business[];
  total: number;
  page: number;
  pages: number;
};

export type Connection = {
  business: Business;
  /** why this connection exists — always explain (REBUILD-PLAN D10) */
  reason: string;
  distanceM: number | null;
};

/** Constructive benchmark — opportunity framing only, never deficiency
 *  language, never named loser-comparisons (REBUILD-PLAN D10 / D8 #2). */
export type Benchmark = {
  categoryLabel: string;
  ratedPeers: number;
  /** 0-100; share of rated category peers this business's rating meets or beats */
  ratingPercentile: number | null;
  categoryAvgRating: number | null;
  categoryMedianReviews: number | null;
  opportunities: { title: string; detail: string }[];
};
