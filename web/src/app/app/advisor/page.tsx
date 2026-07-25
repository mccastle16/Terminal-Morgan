import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import {
  getCategories,
  getNeighborhoods,
  getStats,
  searchBusinesses,
} from "@/lib/data";
import type { AdvisorDataset } from "./engine";
import { AdvisorChat } from "./chat";

export const metadata: Metadata = { title: "AI Adviser — CO_ Network" };

// AI Adviser — available to every role. The server prepares a serializable,
// public-safe dataset snapshot; the chat + engine run entirely client-side
// (local rule-based, no API).
export default async function AdvisorPage() {
  await getSession(); // enforce login; adviser itself is role-agnostic

  const { items } = searchBusinesses({ perPage: 100000 });
  const dataset: AdvisorDataset = {
    businesses: items.map((b) => ({
      slug: b.slug,
      name: b.name,
      category_slug: b.category_slug,
      neighborhood_label: b.neighborhood_label,
      rating: b.rating,
      review_count: b.review_count,
      website: b.website,
      phone: b.phone,
      chamber_member: b.chamber_member,
    })),
    categoryLabels: Object.fromEntries(getCategories().map((c) => [c.slug, c.label])),
    neighborhoods: getNeighborhoods().map((n) => n.label),
    stats: getStats(),
  };

  return <AdvisorChat dataset={dataset} />;
}
