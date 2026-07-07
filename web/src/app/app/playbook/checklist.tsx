"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, SectionLabel, SubtleCard } from "@/components/terminal/ui";

export type PlaybookItem = {
  key: string;
  businessName: string;
  businessSlug: string | null;
  category: string;
  title: string;
  description: string | null;
  priorityScore: number;
};

const STORAGE_KEY = "conet_playbook_done";

// Fixed group order; anything unexpected lands at the end.
const CATEGORY_ORDER = ["reputation", "visibility", "risk", "growth", "data_quality"];
const CATEGORY_LABELS: Record<string, string> = {
  reputation: "Reputation",
  visibility: "Visibility",
  risk: "Risk mitigation",
  growth: "Growth",
  data_quality: "Data quality",
};

function priorityBadge(score: number): { label: string; color?: string } {
  if (score >= 0.7) return { label: "high", color: "var(--color-coral-red)" };
  if (score >= 0.5) return { label: "medium", color: "var(--color-lavender)" };
  return { label: "low" }; // default fog
}

export function PlaybookChecklist({ items }: { items: PlaybookItem[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setDone(parsed as Record<string, boolean>);
        }
      }
    } catch {
      // unreadable storage — start fresh
    }
  }, []);

  const toggle = (key: string) => {
    const next = { ...done, [key]: !done[key] };
    if (!next[key]) delete next[key];
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — completion just won't survive reload
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, PlaybookItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [items]);

  const completed = items.filter((i) => done[i.key]).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Progress */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <p className="text-body-sm text-mist">
            {completed} of {items.length} actions complete
          </p>
          <p className="text-caption text-fog">{pct}% · saved in this browser</p>
        </div>
        <div className="mt-3 h-1 w-full rounded-pills bg-white/5">
          <div
            className="h-1 rounded-pills bg-mist transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      {/* Groups */}
      {groups.map(([category, groupItems]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <SectionLabel>{CATEGORY_LABELS[category] ?? category}</SectionLabel>
            <p className="text-caption text-fog">
              {groupItems.filter((i) => done[i.key]).length} / {groupItems.length} done
            </p>
          </div>

          <div className="space-y-2">
            {groupItems.map((item) => {
              const isDone = !!done[item.key];
              const priority = priorityBadge(item.priorityScore);
              return (
                <SubtleCard key={item.key}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`Mark "${item.title}" ${isDone ? "incomplete" : "complete"}`}
                      onClick={() => toggle(item.key)}
                      className={`mt-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-small border transition-colors duration-150 ${
                        isDone
                          ? "border-mist bg-mist"
                          : "border-smoke bg-transparent hover:border-mist"
                      }`}
                    >
                      {isDone && (
                        <svg
                          viewBox="0 0 12 12"
                          className="h-3 w-3 text-void"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M2 6.5 4.8 9 10 3.5" />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.businessSlug ? (
                          <Link
                            href={`/b/${item.businessSlug}`}
                            className="text-caption font-w510 text-mist transition-colors duration-150 hover:text-paper"
                          >
                            {item.businessName}
                          </Link>
                        ) : (
                          <span className="text-caption font-w510 text-mist">
                            {item.businessName}
                          </span>
                        )}
                        <Badge color={priority.color}>{priority.label}</Badge>
                      </div>
                      <p
                        className={`mt-1 text-body-sm ${
                          isDone ? "text-ash line-through" : "text-mist"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p className={`mt-1 text-caption ${isDone ? "text-ash" : "text-fog"}`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </SubtleCard>
              );
            })}
          </div>
        </section>
      ))}

      {items.length === 0 && (
        <Card className="text-center">
          <p className="text-body-sm font-w510 text-mist">No playbook actions available</p>
          <p className="mt-1 text-caption text-fog">
            The action playbook file is empty for this snapshot.
          </p>
        </Card>
      )}
    </div>
  );
}
