"use client";

// Tour steps — numbered cards with a per-step completion checkbox persisted
// to localStorage (conet_tour).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/terminal/ui";

const STORE_KEY = "conet_tour";

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  note?: string;
};

function readDone(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function TourClient({
  canRecruit,
  canAnalytics,
}: {
  canRecruit: boolean;
  canAnalytics: boolean;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDone(readDone());
  }, []);

  const steps: Step[] = [
    {
      id: "overview",
      title: "Overview",
      description:
        "Your landing view: where the business stands at a glance — rating, category percentile, suggested connections, and what to do next.",
      href: "/app",
      linkLabel: "Open Overview",
    },
    {
      id: "my-business",
      title: "My Business",
      description:
        "The full record the terminal holds on your business — every field, its provenance, and how complete the profile is.",
      href: "/app/my-business",
      linkLabel: "Open My Business",
    },
    {
      id: "advisor",
      title: "AI Adviser",
      description:
        "Ask the directory anything in plain language — market summaries, comparisons, ranked lists, counts, and charts. Computed locally from the snapshot; chats save to the sidebar.",
      href: "/app/advisor",
      linkLabel: "Open AI Adviser",
    },
    {
      id: "recruit",
      title: "Recruit",
      description:
        "The recruit pipeline: non-member and unknown businesses scored and banded A–D for outreach. Visibility varies by role — leadership, membership, and admin see it.",
      href: "/app/recruit",
      linkLabel: "Open Recruit",
      note: canRecruit ? undefined : "Not visible for your current role.",
    },
    {
      id: "analytics",
      title: "Analytics",
      description:
        "Market-level views: category and neighborhood distributions, membership penetration, and data quality — all from the same snapshot.",
      href: "/app/analytics",
      linkLabel: "Open Analytics",
      note: canAnalytics ? undefined : "Not visible for your current role.",
    },
    {
      id: "corrections",
      title: "Corrections",
      description:
        "Spot a wrong phone number or category? Propose a fix. Local-only for now; corrections flow into the provenance system when accounts launch.",
      href: "/app/corrections",
      linkLabel: "Open Corrections",
    },
  ];

  const completed = steps.filter((s) => done[s.id]).length;

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  }

  return (
    <div className="mt-8">
      <p className="text-caption text-fog">
        {completed} of {steps.length} steps complete
      </p>

      <div className="mt-4 space-y-4">
        {steps.map((step, i) => {
          const isDone = !!done[step.id];
          return (
            <Card key={step.id}>
              <div className="flex items-start gap-5">
                <p className="w-10 shrink-0 text-subheading font-w510 text-ash">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-body-sm font-w510 ${isDone ? "text-fog" : "text-paper"}`}
                  >
                    {step.title}
                  </p>
                  <p className="mt-1 text-caption text-fog">{step.description}</p>
                  {step.note && <p className="mt-1 text-label text-ash">{step.note}</p>}
                  <Link
                    href={step.href}
                    className="mt-2 inline-block text-caption text-mist underline decoration-graphite underline-offset-4 transition-colors duration-150 hover:text-paper hover:decoration-smoke"
                  >
                    {step.linkLabel} {"→"}
                  </Link>
                </div>
                <button
                  onClick={() => toggle(step.id)}
                  aria-pressed={isDone}
                  aria-label={isDone ? `Mark ${step.title} incomplete` : `Mark ${step.title} complete`}
                  className="flex shrink-0 cursor-pointer items-center gap-2 text-label text-fog transition-colors duration-150 hover:text-mist"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-small border ${
                      isDone ? "border-mist bg-mist text-void" : "border-graphite"
                    }`}
                  >
                    {isDone && <Check size={11} aria-hidden />}
                  </span>
                  Done
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
