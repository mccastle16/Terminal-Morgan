// Server-side access to the role-gated internal snapshot
// (web/src/data/internal.json — validation/trust/risk/review-theme fields;
// no contact names). Import ONLY from Server Components on gated routes.

import internalJson from "@/data/internal.json";

export type InternalRecord = {
  id: string;
  slug: string;
  validation_tier: string | null;
  osint_confidence: string | null;
  corroboration_count: string | null;
  corroboration_sources: string | null;
  red_flag_present: string | null; // 'Y' | 'N' | null
  red_flag_severity: string | null;
  red_flag_notes: string | null;
  top_delights: string | null;
  top_pain_points: string | null;
  source_file: string | null;
  last_reviewed_date: string | null;
  chamber_member: boolean | null; // tri-state
};

const records = internalJson as InternalRecord[];
const byId = new Map(records.map((r) => [r.id, r]));

export function getInternalAll(): InternalRecord[] {
  return records;
}

export function getInternal(id: string): InternalRecord | undefined {
  return byId.get(id);
}

export function getRedFlagged(): InternalRecord[] {
  return records.filter((r) => r.red_flag_present === "Y");
}
