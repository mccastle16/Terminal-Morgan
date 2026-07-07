import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { searchBusinesses } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/terminal/ui";
import { PlaybookChecklist, type PlaybookItem } from "./checklist";

export const metadata: Metadata = { title: "Playbook — CO_ Network" };

// Shape of public/ldata/action_playbook.json (model-generated action plans).
type PlaybookAction = {
  action_type?: string;
  category: string;
  title: string;
  description?: string;
  priority?: string;
};

type PlaybookEntry = {
  business_id: string;
  business_name: string;
  category_primary?: string;
  priority_score: number;
  actions: PlaybookAction[];
};

type PlaybookFile = {
  generated_at?: string;
  playbook: PlaybookEntry[];
};

export default async function PlaybookPage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_analytics")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  // Small file — read server-side from public/ rather than fetching ourselves.
  const raw = await readFile(
    path.join(process.cwd(), "public/ldata/action_playbook.json"),
    "utf8"
  );
  const data = JSON.parse(raw) as PlaybookFile;
  const entries = data.playbook ?? [];

  // Playbook business_ids are legacy compact slugs, not snapshot ids — match
  // by lowercased name (as the legacy page did) with slug as a fallback.
  const all = searchBusinesses({ perPage: 100000 }).items;
  const byName = new Map(all.map((b) => [b.name.toLowerCase(), b]));
  const bySlug = new Map(all.map((b) => [b.slug, b]));

  const items: PlaybookItem[] = entries.flatMap((entry) => {
    const matched =
      byName.get(entry.business_name.toLowerCase()) ??
      bySlug.get(entry.business_id) ??
      null;
    return entry.actions.map((action, i) => ({
      key: `${entry.business_id}_${i}`,
      businessName: entry.business_name,
      businessSlug: matched?.slug ?? null,
      category: action.category,
      title: action.title,
      description: action.description ?? null,
      priorityScore: entry.priority_score,
    }));
  });

  const businessCount = new Set(entries.map((e) => e.business_id)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        section="Actions"
        title="Playbook"
        description={`${items.length} model-generated actions across ${businessCount} businesses${
          data.generated_at ? `, generated ${data.generated_at.slice(0, 10)}` : ""
        }. Completion is tracked locally in this browser.`}
      />

      <PlaybookChecklist items={items} />
    </div>
  );
}
