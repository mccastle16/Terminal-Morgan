// Recruitability scoring engine — 1:1 port of the legacy
// dashboard/src/terminal/config/scoring.js, retyped over the new data layer
// (Business + InternalRecord). Weights, thresholds, and bands are unchanged;
// band colors are remapped to LinearDesign.md accents.

import type { Business } from "@/lib/data";
import type { InternalRecord } from "./internal";

const WEIGHTS = {
  categoryFit: 0.15,
  locationQuality: 0.1,
  websitePresence: 0.1,
  phonePresence: 0.1,
  ratingStrength: 0.2,
  validationTier: 0.15,
  corroboration: 0.1,
  reviewVolume: 0.1,
};

const HIGH_VALUE_CATEGORIES = new Set([
  "legal", "financial_services", "banking", "insurance", "real_estate",
  "consulting", "professional_services", "technology", "healthcare",
  "accounting", "hospitality", "construction",
]);

const MEDIUM_VALUE_CATEGORIES = new Set([
  "food_beverage", "retail", "wellness", "education", "marketing",
  "arts_culture", "nonprofit",
]);

export function computeRecruitabilityScore(b: Business, i?: InternalRecord): number {
  let score = 0;

  const cat = b.category_slug;
  if (HIGH_VALUE_CATEGORIES.has(cat)) score += WEIGHTS.categoryFit * 100;
  else if (MEDIUM_VALUE_CATEGORIES.has(cat)) score += WEIGHTS.categoryFit * 60;
  else if (cat !== "other") score += WEIGHTS.categoryFit * 30;

  const hasGeo = b.lat != null && b.lon != null;
  const hasNeighborhood =
    !!b.neighborhood_label && b.neighborhood_label !== "Coral Gables";
  if (hasGeo && hasNeighborhood) score += WEIGHTS.locationQuality * 100;
  else if (hasGeo || hasNeighborhood) score += WEIGHTS.locationQuality * 50;

  if (b.website) score += WEIGHTS.websitePresence * 100;
  if (b.phone) score += WEIGHTS.phonePresence * 100;

  const rating = b.rating ?? 0;
  if (rating >= 4.5) score += WEIGHTS.ratingStrength * 100;
  else if (rating >= 4.0) score += WEIGHTS.ratingStrength * 85;
  else if (rating >= 3.5) score += WEIGHTS.ratingStrength * 60;
  else if (rating >= 3.0) score += WEIGHTS.ratingStrength * 40;
  else if (rating > 0) score += WEIGHTS.ratingStrength * 20;

  const tier = (i?.validation_tier ?? "").toLowerCase();
  if (tier === "high") score += WEIGHTS.validationTier * 100;
  else if (tier === "moderate") score += WEIGHTS.validationTier * 60;
  else if (tier === "low") score += WEIGHTS.validationTier * 25;

  const corr = Number(i?.corroboration_count ?? 0) || 0;
  if (corr >= 3) score += WEIGHTS.corroboration * 100;
  else if (corr === 2) score += WEIGHTS.corroboration * 70;
  else if (corr === 1) score += WEIGHTS.corroboration * 30;

  const reviews = b.review_count ?? 0;
  if (reviews >= 50) score += WEIGHTS.reviewVolume * 100;
  else if (reviews >= 20) score += WEIGHTS.reviewVolume * 75;
  else if (reviews >= 5) score += WEIGHTS.reviewVolume * 40;
  else if (reviews > 0) score += WEIGHTS.reviewVolume * 15;

  return Math.round(score);
}

export type Band = { band: "A" | "B" | "C" | "D"; label: string; color: string };

export function getRecruitabilityBand(score: number): Band {
  if (score >= 75) return { band: "A", label: "Top Prospect", color: "var(--color-pulse-green)" };
  if (score >= 55) return { band: "B", label: "Strong Prospect", color: "var(--color-iris-violet)" };
  if (score >= 35) return { band: "C", label: "Moderate Prospect", color: "var(--color-lavender)" };
  return { band: "D", label: "Low Priority", color: "var(--color-fog)" };
}

export function getRecruitReasons(b: Business, i?: InternalRecord): string[] {
  const reasons: string[] = [];
  const rating = b.rating ?? 0;
  const reviews = b.review_count ?? 0;

  if (HIGH_VALUE_CATEGORIES.has(b.category_slug)) reasons.push("High-value category for chamber");
  if (rating >= 4.0) reasons.push(`Strong rating (${rating.toFixed(1)})`);
  if (reviews >= 20) reasons.push(`Visible business (${reviews} reviews)`);
  if (b.website) reasons.push("Active web presence");
  if (b.neighborhood_label === "Miracle Mile" || b.neighborhood_label === "Merrick Park")
    reasons.push(`Prime location: ${b.neighborhood_label}`);

  const corr = Number(i?.corroboration_count ?? 0) || 0;
  if (corr >= 2) reasons.push(`Multi-source verified (${corr} sources)`);

  return reasons.length > 0 ? reasons : ["Potential local business prospect"];
}
