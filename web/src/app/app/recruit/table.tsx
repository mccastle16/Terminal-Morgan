"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, MonoTag, ghostBtnCls, inputCls } from "@/components/terminal/ui";

export type RecruitRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighborhood: string | null;
  rating: number | null;
  score: number;
  band: "A" | "B" | "C" | "D";
  bandLabel: string;
  bandColor: string;
  reasons: string[];
  membershipUnknown: boolean;
};

const PAGE_SIZE = 40;

export function RecruitTable({ rows }: { rows: RecruitRow[] }) {
  const [band, setBand] = useState("");
  const [category, setCategory] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows]
  );
  const neighborhoods = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.neighborhood).filter((n): n is string => n != null))
      ).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    // Filter on the band letter (r.band), never the label — the legacy page
    // filtered on band.label and matched nothing.
    let out = rows;
    if (band) out = out.filter((r) => r.band === band);
    if (category) out = out.filter((r) => r.category === category);
    if (neighborhood) out = out.filter((r) => r.neighborhood === neighborhood);
    return out;
  }, [rows, band, category, neighborhood]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <select
            aria-label="Filter by band"
            className={inputCls()}
            value={band}
            onChange={(e) => {
              setBand(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All bands</option>
            <option value="A">Band A — Top</option>
            <option value="B">Band B — Strong</option>
            <option value="C">Band C — Moderate</option>
            <option value="D">Band D — Low</option>
          </select>
        </div>
        <div className="w-56">
          <select
            aria-label="Filter by category"
            className={inputCls()}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="w-56">
          <select
            aria-label="Filter by neighborhood"
            className={inputCls()}
            value={neighborhood}
            onChange={(e) => {
              setNeighborhood(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All neighborhoods</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p className="ml-auto text-caption text-fog">
          {filtered.length.toLocaleString()} prospects
        </p>
      </div>

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-graphite px-4 py-3">
          <span className="w-10 text-label font-w510 uppercase tracking-wide text-ash">#</span>
          <span className="min-w-0 flex-1 text-label font-w510 uppercase tracking-wide text-ash">
            Business
          </span>
          <span className="hidden w-44 text-label font-w510 uppercase tracking-wide text-ash md:block">
            Category
          </span>
          <span className="hidden w-36 text-label font-w510 uppercase tracking-wide text-ash md:block">
            Neighborhood
          </span>
          <span className="w-14 text-right text-label font-w510 uppercase tracking-wide text-ash">
            Rating
          </span>
          <span className="w-14 text-right text-label font-w510 uppercase tracking-wide text-ash">
            Score
          </span>
          <span className="w-24 text-right text-label font-w510 uppercase tracking-wide text-ash">
            Band
          </span>
        </div>

        <div className="divide-y divide-graphite">
          {paginated.map((r, idx) => {
            const expanded = expandedId === r.id;
            return (
              <div key={r.id}>
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-white/[0.03]"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                >
                  <span className="w-10">
                    <MonoTag>{safePage * PAGE_SIZE + idx + 1}</MonoTag>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/b/${r.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-body-sm font-w510 text-mist transition-colors duration-150 hover:text-paper"
                      >
                        {r.name}
                      </Link>
                      {r.membershipUnknown && <Badge>membership unknown</Badge>}
                    </div>
                  </div>
                  <span className="hidden w-44 truncate text-caption text-fog md:block">
                    {r.category}
                  </span>
                  <span className="hidden w-36 truncate text-caption text-fog md:block">
                    {r.neighborhood ?? "—"}
                  </span>
                  <span className="w-14 text-right text-caption text-mist">
                    {r.rating != null ? r.rating.toFixed(1) : "—"}
                  </span>
                  <span className="w-14 text-right text-body-sm font-w510 text-paper">
                    {r.score}
                  </span>
                  <span className="w-24 text-right">
                    <Badge color={r.bandColor}>{r.band}</Badge>
                  </span>
                </div>

                {expanded && (
                  <div className="border-t border-graphite bg-void/60 px-4 py-4 pl-[68px]">
                    <p className="text-label font-w510 uppercase tracking-wide text-ash">
                      Why this prospect scores {r.score} — {r.bandLabel}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {r.reasons.map((reason) => (
                        <li key={reason} className="text-caption text-mist">
                          {reason}
                        </li>
                      ))}
                    </ul>
                    {r.membershipUnknown && (
                      <p className="mt-3 text-caption text-fog">
                        Membership status is unknown — this business is included in the
                        queue and flagged. Confirm it in the Resolve tab.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {paginated.length === 0 && (
            <p className="px-4 py-10 text-center text-caption text-fog">
              No prospects match the current filters.
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-graphite px-4 py-3">
            <p className="text-caption text-fog">
              Page {safePage + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={ghostBtnCls()}
                disabled={safePage === 0}
                onClick={() => setPage(Math.max(0, safePage - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={ghostBtnCls()}
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
