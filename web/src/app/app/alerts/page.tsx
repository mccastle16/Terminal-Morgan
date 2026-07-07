import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { getInternal, getInternalAll } from "@/lib/terminal/internal";
import { computeRecruitabilityScore } from "@/lib/terminal/scoring";
import { searchBusinesses } from "@/lib/data";
import { EmptyState, PageHeader, StatCard } from "@/components/terminal/ui";
import { AlertList, type Alert } from "./list";

export const metadata: Metadata = { title: "Alerts — CO_ Network" };

// Alert rule engine — the legacy AlertsPage rules recomputed server-side over
// the new data layer on every request. Nothing here is stored; every number
// is derived from the current snapshot.
export default async function AlertsPage() {
  const { role } = await getSession();
  if (!hasPermission(role, "view_risk_flags")) {
    return (
      <EmptyState
        title="Not available in this view"
        detail="Your role doesn't include this surface."
      />
    );
  }

  const businesses = searchBusinesses({ perPage: 100000 }).items;
  const internal = getInternalAll();
  const alerts: Alert[] = [];

  // ── Risk: critical red flags ───────────────────────────────────────────
  const flagged = internal.filter((r) => r.red_flag_present === "Y");
  const critical = flagged.filter((r) => r.red_flag_severity === "Critical");
  if (critical.length > 0) {
    alerts.push({
      id: "critical-flags",
      severity: "critical",
      title: `${critical.length} critical risk flags active`,
      detail:
        "Businesses carrying critical-severity red flags in the internal snapshot. Triage them in the Risks tab.",
      count: critical.length,
    });
  }
  if (flagged.length > critical.length) {
    alerts.push({
      id: "all-flags",
      severity: "operational",
      title: `${flagged.length} businesses carry risk flags in total`,
      detail: `${critical.length} critical, ${flagged.length - critical.length} operational.`,
      count: flagged.length,
    });
  }

  // ── Data freshness — days since the newest last_reviewed_date ─────────
  const newestReview = internal
    .map((r) => r.last_reviewed_date)
    .filter((d): d is string => d != null)
    .sort()
    .at(-1);
  if (newestReview) {
    const daysSince = Math.max(
      0,
      Math.floor((Date.now() - new Date(newestReview).getTime()) / 86400000)
    );
    alerts.push({
      id: "stale-data",
      severity: daysSince > 60 ? "critical" : daysSince > 30 ? "operational" : "info",
      title: `Snapshot data is ${daysSince} days old`,
      detail: `Newest internal review date is ${newestReview}. Computed against today, not hardcoded.`,
      count: daysSince,
    });
  }

  // ── Membership unknowns ────────────────────────────────────────────────
  const unknowns = businesses.filter((b) => b.chamber_member === null).length;
  if (unknowns > 0) {
    alerts.push({
      id: "membership-unknowns",
      severity: unknowns > 500 ? "critical" : unknowns > 100 ? "operational" : "info",
      title: `${unknowns.toLocaleString()} businesses with unknown membership`,
      detail:
        "Unknown status weakens penetration metrics. Work these down in the Resolve tab.",
      count: unknowns,
    });
  }

  // ── Low-confidence records (osint_confidence < 0.5) ───────────────────
  const lowConfidence = internal.filter((r) => {
    if (r.osint_confidence == null) return false;
    const c = Number(r.osint_confidence);
    return Number.isFinite(c) && c < 0.5;
  }).length;
  if (lowConfidence > 0) {
    alerts.push({
      id: "low-confidence",
      severity: "operational",
      title: `${lowConfidence.toLocaleString()} low-confidence records`,
      detail:
        "Records with OSINT confidence below 50% — candidates for re-verification.",
      count: lowConfidence,
    });
  }

  // ── Opportunity: hot recruits (score ≥ 80 among non-verified-members) ──
  const hotRecruits = businesses.filter(
    (b) =>
      b.chamber_member !== true &&
      computeRecruitabilityScore(b, getInternal(b.id)) >= 80
  ).length;
  if (hotRecruits > 0) {
    alerts.push({
      id: "hot-recruits",
      severity: "info",
      title: `${hotRecruits} high-value recruit targets`,
      detail:
        "Non-member businesses scoring 80+ on recruitability — prime outreach candidates in the Recruit tab.",
      count: hotRecruits,
    });
  }

  // ── Member health: verified members rated below 3.0 ───────────────────
  const lowRatedMembers = businesses.filter(
    (b) => b.chamber_member === true && b.rating != null && b.rating < 3.0
  ).length;
  if (lowRatedMembers > 0) {
    alerts.push({
      id: "low-rated-members",
      severity: "operational",
      title: `${lowRatedMembers} members rated below 3.0`,
      detail:
        "Verified members with concerning public ratings — proactive support outreach recommended.",
      count: lowRatedMembers,
    });
  }

  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-8">
      <PageHeader
        section="Actions"
        title="Alerts"
        description="Risk, data-quality, and opportunity signals derived from the current snapshot."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Active alerts" value={alerts.length} />
        <StatCard
          label="Critical"
          value={criticalAlerts}
          accent={criticalAlerts > 0 ? "var(--color-coral-red)" : undefined}
        />
        <StatCard
          label="Data basis"
          value={businesses.length.toLocaleString()}
          detail="businesses evaluated"
        />
      </div>

      <AlertList alerts={alerts} />
    </div>
  );
}
