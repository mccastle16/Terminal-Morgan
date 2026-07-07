"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  MonoTag,
  StatCard,
  ghostBtnCls,
  inputCls,
} from "@/components/terminal/ui";

export type ResolveRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighborhood: string | null;
  rating: number | null;
  confidence: number | null; // 0–1
};

type Resolution = "member" | "nonmember";
type SortKey = "rating" | "confidence" | "name";

const STORAGE_KEY = "conet_resolutions";
const PAGE_SIZE = 40;

export function ResolveTable({ rows }: { rows: ResolveRow[] }) {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [page, setPage] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const clean: Record<string, Resolution> = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (v === "member" || v === "nonmember") clean[k] = v;
          }
          setResolutions(clean);
        }
      }
    } catch {
      // unreadable storage — start fresh
    }
  }, []);

  const resolve = (id: string, status: Resolution) => {
    const next = { ...resolutions };
    if (next[id] === status) delete next[id]; // toggle off
    else next[id] = status;
    setResolutions(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — resolutions just won't survive reload
    }
  };

  const sorted = useMemo(() => {
    const out = [...rows];
    if (sortBy === "rating") {
      out.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name));
    } else if (sortBy === "confidence") {
      out.sort(
        (a, b) => (b.confidence ?? -1) - (a.confidence ?? -1) || a.name.localeCompare(b.name)
      );
    } else {
      out.sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [rows, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const resolvedCount = Object.keys(resolutions).length;
  const resolvedMembers = Object.values(resolutions).filter((v) => v === "member").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Unknown remaining"
          value={(rows.length - resolvedCount).toLocaleString()}
          detail={`of ${rows.length.toLocaleString()} total unknowns`}
        />
        <StatCard
          label="Resolved this session"
          value={resolvedCount.toLocaleString()}
          detail={
            resolvedCount > 0
              ? `${resolvedMembers} member · ${resolvedCount - resolvedMembers} non-member`
              : "none yet"
          }
        />
        <StatCard
          label="Storage"
          value="Local"
          detail="this browser only — syncs when accounts launch"
        />
      </div>

      <p className="text-caption text-fog">
        Resolutions are stored locally in this browser and don&apos;t change the shared
        dataset — they&apos;ll carry into accounts when accounts launch.
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="w-48">
          <select
            aria-label="Sort by"
            className={inputCls()}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortKey);
              setPage(0);
            }}
          >
            <option value="rating">Sort: rating</option>
            <option value="confidence">Sort: confidence</option>
            <option value="name">Sort: name</option>
          </select>
        </div>
        <p className="text-caption text-fog">{sorted.length.toLocaleString()} unknowns</p>
      </div>

      <Card padded={false}>
        <div className="divide-y divide-graphite">
          {paginated.map((r) => {
            const resolution = resolutions[r.id];
            return (
              <div key={r.id} className="flex items-center gap-4 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/b/${r.slug}`}
                    className="block truncate text-body-sm font-w510 text-mist transition-colors duration-150 hover:text-paper"
                  >
                    {r.name}
                  </Link>
                  <p className="mt-0.5 truncate text-caption text-fog">
                    {r.category}
                    {r.neighborhood && <> · {r.neighborhood}</>}
                  </p>
                </div>

                <span className="w-12 shrink-0 text-right text-caption text-mist">
                  {r.rating != null ? r.rating.toFixed(1) : "—"}
                </span>
                <span className="w-14 shrink-0 text-right">
                  <MonoTag>
                    {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}
                  </MonoTag>
                </span>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={resolution === "member"}
                    className={`${ghostBtnCls()} ${
                      resolution === "member"
                        ? "border-smoke bg-white/[0.06] text-paper"
                        : ""
                    }`}
                    onClick={() => resolve(r.id, "member")}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    aria-pressed={resolution === "nonmember"}
                    className={`${ghostBtnCls()} ${
                      resolution === "nonmember"
                        ? "border-smoke bg-white/[0.06] text-paper"
                        : ""
                    }`}
                    onClick={() => resolve(r.id, "nonmember")}
                  >
                    Non-member
                  </button>
                </div>
              </div>
            );
          })}
          {paginated.length === 0 && (
            <p className="px-6 py-10 text-center text-caption text-fog">
              No unknown-membership businesses in the current snapshot.
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-graphite px-6 py-3">
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
