import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getCategoryLabel, searchBusinesses } from "@/lib/data";
import {
  PageHeader,
  Card,
  SubtleCard,
  StatCard,
  SectionLabel,
  EmptyState,
  MonoTag,
} from "@/components/terminal/ui";
import { CountBarChart } from "./charts";
import { NetworkSection } from "./network";

export const metadata: Metadata = { title: "Intelligence — CO_ Network" };

// ── Shapes of the small ldata JSONs read at request time ────────────────────

type SentimentThemes = {
  total_businesses: number;
  with_sentiment_text: number;
  sentiment_distribution: Record<string, number>;
  delight_themes: Record<string, number>;
  pain_themes: Record<string, number>;
  category_sentiment: {
    category: string;
    avg_rating: number;
    avg_css: number;
    dominant_sentiment: string;
    count: number;
    positive_pct: number;
    negative_pct: number;
  }[];
};

type PredictionSummary = {
  total_businesses: number;
  membership_distribution: { high?: number; medium?: number; low?: number };
  growth_distribution: { growing?: number; stable?: number; declining?: number };
  avg_membership_probability: number;
  avg_growth_trajectory: number;
  members_count: number;
  churn_risk_high: number;
  churn_risk_medium: number;
  churn_risk_low: number;
  high_potential_recruits: number;
  category_predictions: {
    category: string;
    count: number;
    avg_membership_prob: number;
    avg_growth_trajectory: number;
  }[];
};

function catLabel(slug: string): string {
  const l = getCategoryLabel(slug);
  return l === slug ? slug.replace(/_/g, " ") : l;
}

async function readLdata<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(process.cwd(), "public/ldata", file), "utf-8");
  return JSON.parse(raw) as T;
}

const SENTIMENT_ORDER = ["very_positive", "positive", "neutral", "negative", "unrated"];

export default async function IntelligencePage() {
  const session = await getSession();
  if (!hasPermission(session.role, "view_analytics")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const sentiment = await readLdata<SentimentThemes>("sentiment_themes.json");
  const predictions = await readLdata<PredictionSummary>("prediction_summary.json");

  // ── Sentiment ──────────────────────────────────────────────────────────────
  const dist = sentiment.sentiment_distribution;
  const positivePct = Math.round(
    (((dist.very_positive ?? 0) + (dist.positive ?? 0)) / sentiment.total_businesses) * 100
  );
  const distRows = SENTIMENT_ORDER.filter((k) => dist[k] != null).map((k) => ({
    key: k,
    label: k.replace(/_/g, " "),
    count: dist[k],
  }));
  const maxDist = Math.max(...distRows.map((r) => r.count), 1);
  const byCss = [...sentiment.category_sentiment].sort((a, b) => b.avg_css - a.avg_css);
  const topCats = byCss.slice(0, 5);
  const bottomCats = byCss.slice(-5).reverse();
  const themeMax = Math.max(
    ...Object.values(sentiment.delight_themes),
    ...Object.values(sentiment.pain_themes),
    1
  );

  // ── Predictions ────────────────────────────────────────────────────────────
  const membershipData = [
    { name: "High (≥70)", value: predictions.membership_distribution.high ?? 0, color: "#27a644" },
    { name: "Medium (40–69)", value: predictions.membership_distribution.medium ?? 0, color: "#6366f1" },
    { name: "Low (<40)", value: predictions.membership_distribution.low ?? 0, color: "#d0d6e0" },
  ];
  const growthData = [
    { name: "Growing", value: predictions.growth_distribution.growing ?? 0, color: "#27a644" },
    { name: "Stable", value: predictions.growth_distribution.stable ?? 0, color: "#d0d6e0" },
    { name: "Declining", value: predictions.growth_distribution.declining ?? 0, color: "#8b5cf6" },
  ];
  const catPred = [...predictions.category_predictions].sort(
    (a, b) => b.avg_growth_trajectory - a.avg_growth_trajectory
  );

  // ── Pricing (from the snapshot via lib/data, server-side) ──────────────────
  const all = searchBusinesses({ perPage: 100000 }).items;
  const tiers = ["$", "$$", "$$$", "$$$$"] as const;
  const tierRows = tiers.map((tier) => {
    const inTier = all.filter((b) => b.price_tier === tier);
    const members = inTier.filter((b) => b.chamber_member === true).length;
    const rated = inTier.filter((b) => b.rating != null);
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, b) => s + (b.rating as number), 0) / rated.length
        : null;
    return {
      tier,
      count: inTier.length,
      members,
      penetration: inTier.length > 0 ? Math.round((members / inTier.length) * 100) : 0,
      avgRating,
    };
  });
  const priced = all.filter((b) => b.price_tier != null).length;
  const priceCoverage = all.length > 0 ? Math.round((priced / all.length) * 100) : 0;
  const maxTier = Math.max(...tierRows.map((t) => t.count), 1);

  return (
    <div className="space-y-10">
      <PageHeader
        section="Insights"
        title="Intelligence"
        description="Sentiment analysis, predictive modeling, network centrality, and pricing structure across the market."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Market sentiment" value={`${positivePct}%`} detail="positive or very positive" />
        <StatCard
          label="Avg membership prob"
          value={`${predictions.avg_membership_probability}/100`}
          detail={`${predictions.high_potential_recruits} high-potential recruits`}
        />
        <StatCard
          label="Avg growth trajectory"
          value={`${predictions.avg_growth_trajectory > 0 ? "+" : ""}${predictions.avg_growth_trajectory}`}
          detail="momentum score across market"
        />
        <StatCard
          label="Churn risk"
          value={predictions.churn_risk_high + predictions.churn_risk_medium}
          detail={`${predictions.churn_risk_high} high · ${predictions.churn_risk_medium} medium`}
        />
      </div>

      {/* ── Sentiment ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Sentiment</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <p className="text-body-sm font-w510 text-paper">Sentiment distribution</p>
            <p className="mt-1 text-label text-ash">
              {sentiment.total_businesses.toLocaleString()} businesses scored ·{" "}
              {sentiment.with_sentiment_text} with review text
            </p>
            <div className="mt-4 space-y-3">
              {distRows.map((r) => (
                <div key={r.key} className="flex items-center gap-3">
                  <p className="w-28 shrink-0 text-caption capitalize text-fog">{r.label}</p>
                  <div className="h-1.5 flex-1 rounded-pills bg-white/5">
                    <div
                      className={`h-full rounded-pills ${r.key === "negative" ? "bg-coral-red/70" : "bg-mist/70"}`}
                      style={{ width: `${(r.count / maxDist) * 100}%` }}
                    />
                  </div>
                  <p className="w-14 shrink-0 text-right text-caption text-mist">
                    {r.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-body-sm font-w510 text-paper">Sentiment by category</p>
            <p className="mt-1 text-label text-ash">Composite sentiment score (0–100)</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-label font-w510 uppercase tracking-wide text-ash">Strongest</p>
                <div className="mt-2 space-y-2">
                  {topCats.map((c) => (
                    <div key={c.category} className="flex items-center justify-between gap-2">
                      <p className="truncate text-caption capitalize text-mist">{catLabel(c.category)}</p>
                      <MonoTag>{c.avg_css}</MonoTag>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-label font-w510 uppercase tracking-wide text-ash">Weakest</p>
                <div className="mt-2 space-y-2">
                  {bottomCats.map((c) => (
                    <div key={c.category} className="flex items-center justify-between gap-2">
                      <p className="truncate text-caption capitalize text-mist">{catLabel(c.category)}</p>
                      <MonoTag>{c.avg_css}</MonoTag>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SubtleCard>
            <p className="text-caption font-w510 text-mist">Delight themes</p>
            <div className="mt-3 space-y-2">
              {Object.entries(sentiment.delight_themes).map(([theme, count]) => (
                <div key={theme} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 text-caption capitalize text-fog">
                    {theme.replace(/_/g, " ")}
                  </p>
                  <div className="h-1.5 flex-1 rounded-pills bg-white/5">
                    <div
                      className="h-full rounded-pills bg-pulse-green/80"
                      style={{ width: `${(count / themeMax) * 100}%` }}
                    />
                  </div>
                  <p className="w-8 shrink-0 text-right text-caption text-mist">{count}</p>
                </div>
              ))}
            </div>
          </SubtleCard>
          <SubtleCard>
            <p className="text-caption font-w510 text-mist">Pain themes</p>
            <div className="mt-3 space-y-2">
              {Object.entries(sentiment.pain_themes).map(([theme, count]) => (
                <div key={theme} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 text-caption capitalize text-fog">
                    {theme.replace(/_/g, " ")}
                  </p>
                  <div className="h-1.5 flex-1 rounded-pills bg-white/5">
                    <div
                      className="h-full rounded-pills bg-coral-red/70"
                      style={{ width: `${(count / themeMax) * 100}%` }}
                    />
                  </div>
                  <p className="w-8 shrink-0 text-right text-caption text-mist">{count}</p>
                </div>
              ))}
            </div>
          </SubtleCard>
        </div>
        <p className="text-caption text-ash">
          Theme extraction covers the {sentiment.with_sentiment_text} businesses with review text —
          a thin slice of the market. Treat themes as anecdotal signals.
        </p>
      </section>

      {/* ── Predictions ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Predictions</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <p className="text-body-sm font-w510 text-paper">Membership probability</p>
            <p className="mt-1 text-label text-ash">
              Likelihood to join or retain membership, {predictions.total_businesses.toLocaleString()} businesses
            </p>
            <div className="mt-2">
              <CountBarChart data={membershipData} />
            </div>
          </Card>
          <Card>
            <p className="text-body-sm font-w510 text-paper">Growth trajectory</p>
            <p className="mt-1 text-label text-ash">Momentum signals across the market</p>
            <div className="mt-2">
              <CountBarChart data={growthData} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SubtleCard>
            <p className="text-label font-w510 uppercase tracking-wide text-ash">High churn risk</p>
            <p className="mt-1 text-subheading font-w510 text-paper">{predictions.churn_risk_high}</p>
            <p className="mt-1 text-label text-fog">members with trajectory ≤ −10</p>
          </SubtleCard>
          <SubtleCard>
            <p className="text-label font-w510 uppercase tracking-wide text-ash">Medium churn risk</p>
            <p className="mt-1 text-subheading font-w510 text-paper">{predictions.churn_risk_medium}</p>
            <p className="mt-1 text-label text-fog">members with early warning signs</p>
          </SubtleCard>
          <SubtleCard>
            <p className="text-label font-w510 uppercase tracking-wide text-ash">Healthy members</p>
            <p className="mt-1 text-subheading font-w510 text-paper">{predictions.churn_risk_low}</p>
            <p className="mt-1 text-label text-fog">stable or growing trajectory</p>
          </SubtleCard>
        </div>

        <Card padded={false}>
          <div className="border-b border-graphite px-6 py-4">
            <p className="text-body-sm font-w510 text-paper">Category predictions</p>
            <p className="mt-1 text-label text-ash">
              Average membership probability and growth trajectory by category
            </p>
          </div>
          <div className="hidden grid-cols-[1.6fr_0.6fr_1fr_1fr] gap-4 border-b border-graphite px-6 py-3 md:grid">
            <p className="text-label text-ash">Category</p>
            <p className="text-label text-ash text-right">Businesses</p>
            <p className="text-label text-ash text-right">Membership prob</p>
            <p className="text-label text-ash text-right">Growth trajectory</p>
          </div>
          <div className="divide-y divide-graphite">
            {catPred.map((c) => (
              <div
                key={c.category}
                className="grid grid-cols-2 gap-x-4 gap-y-1 px-6 py-2.5 md:grid-cols-[1.6fr_0.6fr_1fr_1fr] md:items-center"
              >
                <p className="text-caption capitalize text-mist">{catLabel(c.category)}</p>
                <p className="text-caption text-fog md:text-right">{c.count}</p>
                <p className="text-caption text-fog md:text-right">{c.avg_membership_prob}/100</p>
                <p className="text-caption text-mist md:text-right">
                  {c.avg_growth_trajectory > 0 ? "+" : ""}
                  {c.avg_growth_trajectory}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <p className="text-caption text-ash">
          Model note: average membership probability across the market is{" "}
          {predictions.avg_membership_probability}/100 and the model surfaces{" "}
          {predictions.high_potential_recruits} high-potential recruits — it rarely predicts
          joiners with confidence. Treat these scores as directional, not as forecasts.
        </p>
      </section>

      {/* ── Network ───────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Network</SectionLabel>
        <NetworkSection />
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Pricing</SectionLabel>
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite px-6 py-4">
            <p className="text-body-sm font-w510 text-paper">Price tier structure</p>
            <p className="text-label text-ash">{priceCoverage}% of businesses have a listed tier</p>
          </div>
          <div className="divide-y divide-graphite">
            {tierRows.map((t) => (
              <div
                key={t.tier}
                className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-6 py-3 md:grid-cols-[3rem_1fr_5rem_6rem_6rem]"
              >
                <MonoTag>{t.tier}</MonoTag>
                <div className="col-span-2 h-1.5 rounded-pills bg-white/5 md:col-span-1">
                  <div
                    className="h-full rounded-pills bg-mist/70"
                    style={{ width: `${(t.count / maxTier) * 100}%` }}
                  />
                </div>
                <p className="text-caption text-mist md:text-right">{t.count.toLocaleString()}</p>
                <p className="text-caption text-fog md:text-right">{t.penetration}% members</p>
                <p className="text-caption text-fog md:text-right">
                  {t.avgRating != null ? `${t.avgRating.toFixed(2)} avg` : "— avg"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
