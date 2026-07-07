"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, MonoTag, ghostBtnCls, inputCls } from "@/components/terminal/ui";

export type CompareBiz = {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighborhood: string | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
  price_tier: "$" | "$$" | "$$$" | "$$$$" | null;
  validation_tier: string | null;
  osint_confidence: number | null; // 0–1
  corroboration_count: number | null;
  red_flag_present: boolean;
};

// Each metric renders a display value and a comparable score (higher wins;
// null = not comparable, no leader highlighted).
type Metric = {
  label: string;
  value: (b: CompareBiz) => string;
  score: (b: CompareBiz) => number | null;
};

const TIER_SCORE: Record<string, number> = { high: 3, moderate: 2, low: 1 };

const METRICS: Metric[] = [
  {
    label: "Rating",
    value: (b) => (b.rating != null ? b.rating.toFixed(1) : "—"),
    score: (b) => b.rating,
  },
  {
    label: "Reviews",
    value: (b) => (b.review_count != null ? b.review_count.toLocaleString() : "—"),
    score: (b) => b.review_count,
  },
  {
    label: "Validation tier",
    value: (b) => b.validation_tier ?? "—",
    score: (b) =>
      b.validation_tier != null
        ? (TIER_SCORE[b.validation_tier.toLowerCase()] ?? null)
        : null,
  },
  {
    // Confidence is stored 0–1; render as a percentage (×100) — the legacy
    // ComparePage printed the raw 0–1 value with a "%" suffix.
    label: "Confidence",
    value: (b) =>
      b.osint_confidence != null ? `${Math.round(b.osint_confidence * 100)}%` : "—",
    score: (b) => b.osint_confidence,
  },
  {
    label: "Corroboration",
    value: (b) =>
      b.corroboration_count != null ? `${b.corroboration_count} sources` : "—",
    score: (b) => b.corroboration_count,
  },
  {
    label: "Website",
    value: (b) => (b.website ? "Yes" : "No"),
    score: (b) => (b.website ? 1 : 0),
  },
  {
    label: "Phone",
    value: (b) => (b.phone ? "Yes" : "No"),
    score: (b) => (b.phone ? 1 : 0),
  },
  {
    label: "Red flag",
    value: (b) => (b.red_flag_present ? "Flagged" : "None"),
    score: (b) => (b.red_flag_present ? 0 : 1), // clean record leads
  },
];

function BizPicker({
  label,
  businesses,
  selected,
  onSelect,
  onClear,
}: {
  label: string;
  businesses: CompareBiz[];
  selected: CompareBiz | null;
  onSelect: (b: CompareBiz) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return businesses.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, businesses]);

  if (selected) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/b/${selected.slug}`}
              className="block truncate text-body-lg font-w510 text-paper transition-opacity duration-150 hover:opacity-80"
            >
              {selected.name}
            </Link>
            <p className="mt-1 text-caption text-fog">
              {selected.category}
              {selected.neighborhood && <> · {selected.neighborhood}</>}
              {selected.price_tier && <> · {selected.price_tier}</>}
            </p>
          </div>
          <button type="button" className={ghostBtnCls()} onClick={onClear}>
            Clear
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <p className="text-label font-w510 uppercase tracking-wide text-ash">{label}</p>
      <div className="mt-3">
        <input
          type="text"
          className={inputCls()}
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={label}
        />
      </div>
      {results.length > 0 && (
        <div className="absolute left-6 right-6 top-full z-20 -mt-3 max-h-56 overflow-auto rounded-inputs border border-graphite bg-obsidian shadow-xl">
          {results.map((b) => (
            <button
              key={b.id}
              type="button"
              className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-white/[0.04]"
              onClick={() => {
                onSelect(b);
                setQuery("");
              }}
            >
              <span className="truncate text-caption text-mist">{b.name}</span>
              <span className="shrink-0 text-label text-fog">{b.category}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export function CompareTool({ businesses }: { businesses: CompareBiz[] }) {
  const [left, setLeft] = useState<CompareBiz | null>(null);
  const [right, setRight] = useState<CompareBiz | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BizPicker
          label="First business"
          businesses={businesses}
          selected={left}
          onSelect={setLeft}
          onClear={() => setLeft(null)}
        />
        <BizPicker
          label="Second business"
          businesses={businesses}
          selected={right}
          onSelect={setRight}
          onClear={() => setRight(null)}
        />
      </div>

      {left && right ? (
        <Card padded={false}>
          <div className="divide-y divide-graphite">
            {METRICS.map((metric) => {
              const ls = metric.score(left);
              const rs = metric.score(right);
              const comparable = ls != null && rs != null && ls !== rs;
              const leftLeads = comparable && ls > rs;
              const rightLeads = comparable && rs > ls;
              return (
                <div
                  key={metric.label}
                  className="grid grid-cols-3 items-baseline gap-4 px-6 py-3"
                >
                  <span
                    className={`text-body-sm ${
                      leftLeads ? "font-w510 text-paper" : "text-fog"
                    }`}
                  >
                    {metric.value(left)}
                  </span>
                  <span className="text-center">
                    <MonoTag>{metric.label}</MonoTag>
                  </span>
                  <span
                    className={`text-right text-body-sm ${
                      rightLeads ? "font-w510 text-paper" : "text-fog"
                    }`}
                  >
                    {metric.value(right)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="border-t border-graphite px-6 py-3 text-caption text-fog">
            The leading value on each metric is highlighted. Metrics missing on either
            side aren&apos;t scored.
          </p>
        </Card>
      ) : (
        <p className="text-center text-caption text-fog">
          Select two businesses to compare them metric by metric.
        </p>
      )}
    </div>
  );
}
