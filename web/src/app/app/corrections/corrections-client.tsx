"use client";

// Correction form + local submission list. Entries persist to localStorage
// (conet_corrections) and render below as hairline rows with a pending badge.

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Badge,
  Card,
  inputCls,
  MonoTag,
  primaryBtnCls,
  SectionLabel,
} from "@/components/terminal/ui";
import { CORRECTION_FIELDS, type CorrectionBusiness } from "./fields";

type Correction = {
  id: string;
  slug: string;
  businessName: string;
  field: string;
  current: string;
  proposed: string;
  reason: string;
  at: number;
};

const STORE_KEY = "conet_corrections";

function readCorrections(): Correction[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Correction[]) : [];
  } catch {
    return [];
  }
}

export function CorrectionsClient({ businesses }: { businesses: CorrectionBusiness[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CorrectionBusiness | null>(null);
  const [fieldIdx, setFieldIdx] = useState(0);
  const [proposed, setProposed] = useState("");
  const [reason, setReason] = useState("");
  const [corrections, setCorrections] = useState<Correction[]>([]);

  useEffect(() => {
    setCorrections(readCorrections());
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return businesses.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, businesses]);

  const currentValue = selected ? selected.values[fieldIdx] : "";

  function submit() {
    if (!selected || !proposed.trim()) return;
    const entry: Correction = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      slug: selected.slug,
      businessName: selected.name,
      field: CORRECTION_FIELDS[fieldIdx],
      current: currentValue,
      proposed: proposed.trim(),
      reason: reason.trim(),
      at: Date.now(),
    };
    const next = [entry, ...corrections];
    setCorrections(next);
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setSelected(null);
    setQuery("");
    setProposed("");
    setReason("");
    setFieldIdx(0);
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Form */}
      <Card className="lg:col-span-3">
        <SectionLabel>Submit a correction</SectionLabel>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1.5 text-label text-fog">Business</p>
            {selected ? (
              <div className="flex items-center gap-3 rounded-buttons bg-white/[0.04] px-3.5 py-2.5">
                <span className="flex-1 truncate text-caption font-w510 text-mist">
                  {selected.name}
                </span>
                <button
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                  }}
                  className="cursor-pointer text-label text-fog transition-colors duration-150 hover:text-mist"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a business…"
                  className={inputCls() + " pl-9"}
                />
                {results.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-buttons border border-graphite bg-obsidian shadow-sm">
                    {results.map((b) => (
                      <button
                        key={b.slug}
                        onClick={() => {
                          setSelected(b);
                          setQuery("");
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 border-b border-graphite px-3 py-2.5 text-left transition-colors duration-150 last:border-0 hover:bg-white/[0.04]"
                      >
                        <span className="flex-1 truncate text-caption text-mist">{b.name}</span>
                        <span className="shrink-0 text-label text-ash">{b.values[1]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-label text-fog">Field to correct</p>
            <select
              value={fieldIdx}
              onChange={(e) => setFieldIdx(Number(e.target.value))}
              className={inputCls() + " cursor-pointer"}
            >
              {CORRECTION_FIELDS.map((f, i) => (
                <option key={f} value={i}>
                  {f}
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-1.5 text-label text-fog">
                Current value: <MonoTag>{currentValue || "(empty)"}</MonoTag>
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-label text-fog">Proposed value</p>
            <input
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder="Enter the correct value…"
              className={inputCls()}
            />
          </div>

          <div>
            <p className="mb-1.5 text-label text-fog">Reason (optional)</p>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this correction needed?"
              className={inputCls() + " resize-none"}
            />
          </div>

          <button
            onClick={submit}
            disabled={!selected || !proposed.trim()}
            className={primaryBtnCls() + " disabled:cursor-default disabled:opacity-40"}
          >
            Submit correction
          </button>
          <p className="text-label text-ash">
            Stored locally in this browser until accounts launch — then corrections flow into
            the provenance system for review.
          </p>
        </div>
      </Card>

      {/* Submissions */}
      <Card className="lg:col-span-2" padded={false}>
        <div className="flex items-center justify-between border-b border-graphite px-4 py-3">
          <SectionLabel>Your submissions</SectionLabel>
          <MonoTag>{corrections.length}</MonoTag>
        </div>
        {corrections.length === 0 ? (
          <p className="px-4 py-8 text-center text-caption text-fog">
            No corrections submitted yet.
          </p>
        ) : (
          <div className="max-h-[520px] divide-y divide-graphite overflow-y-auto">
            {corrections.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-caption font-w510 text-mist">
                    {c.businessName}
                  </p>
                  <Badge color="var(--color-lavender)">pending review</Badge>
                </div>
                <p className="mt-1 text-label text-fog">
                  {c.field}: <span className="line-through">{c.current || "(empty)"}</span>{" "}
                  {"→"} <span className="text-mist">{c.proposed}</span>
                </p>
                {c.reason && <p className="mt-0.5 text-label text-fog">“{c.reason}”</p>}
                <p className="mt-1 text-label text-ash">
                  {new Date(c.at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
