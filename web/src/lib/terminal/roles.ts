// Role & permission matrix — ported from the legacy dashboard
// (dashboard/src/terminal/config/roles.js) with two changes per operator
// direction: 'teaser' renamed 'nonmember', and the 'sponsor' ROLE is dropped
// (its view_sponsorship permission lives on leadership/admin; Sponsor Intel
// remains a tab). Roles: leadership · membership · member · nonmember · admin.
//
// NOTE: preview-cookie role selection is NOT a security boundary — before any
// public deployment these permissions must be enforced by Supabase RLS
// (REBUILD-PLAN D5); this matrix is the spec for those policies.

export type Role = "leadership" | "membership" | "member" | "nonmember" | "admin";

export const ROLES: Record<
  Role,
  { label: string; description: string; permissions: string[] }
> = {
  leadership: {
    label: "Leadership",
    description: "Full market map and strategy",
    permissions: [
      "view_all_businesses", "view_member_status", "view_non_member_details",
      "view_risk_flags", "view_recruit_queue", "view_analytics", "view_compare",
      "view_market_intel", "export_data", "export_reports", "view_sponsorship",
      "view_data_quality", "view_reviews", "view_actions",
    ],
  },
  membership: {
    label: "Membership",
    description: "Recruit queue focus",
    permissions: [
      "view_all_businesses", "view_member_status", "view_non_member_details",
      "view_recruit_queue", "view_analytics", "view_compare", "export_data",
      "manage_recruit_actions", "view_reviews", "view_actions",
    ],
  },
  member: {
    label: "Member",
    description: "Own profile, peer compare, category intel",
    permissions: [
      "view_own_profile", "view_peer_compare", "view_category_analytics",
      "view_neighborhood_snapshot", "view_limited_market", "view_reviews",
    ],
  },
  nonmember: {
    label: "Non-Member",
    description: "Limited preview",
    permissions: ["view_own_profile_limited", "view_market_summary"],
  },
  admin: {
    label: "Admin",
    description: "Full system access (CO_ operators only)",
    permissions: [
      "view_all_businesses", "view_member_status", "view_non_member_details",
      "view_risk_flags", "view_recruit_queue", "view_analytics", "view_compare",
      "view_market_intel", "export_data", "export_reports", "view_sponsorship",
      "view_data_quality", "manage_tenant", "manage_users", "manage_data_refresh",
      "manage_data", "view_reviews", "view_actions",
    ],
  },
};

export function hasPermission(role: Role, permission: string): boolean {
  return ROLES[role]?.permissions.includes(permission) ?? false;
}

export function isRole(v: string | undefined | null): v is Role {
  return v === "leadership" || v === "membership" || v === "member" ||
    v === "nonmember" || v === "admin";
}

// ── Terminal navigation — the full legacy tab set, permission-mapped ────────
// (permission: undefined = visible to every role, as in the legacy layout)

export type NavItem = { href: string; label: string; permission?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const TERMINAL_NAV: NavGroup[] = [
  {
    label: "Core",
    items: [
      { href: "/app", label: "Overview" },
      { href: "/app/analytics", label: "Analytics", permission: "view_analytics" },
      { href: "/app/my-business", label: "My Business" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/app/opportunities", label: "Opportunities", permission: "view_analytics" },
      { href: "/app/intelligence", label: "Intelligence", permission: "view_analytics" },
      { href: "/app/graph", label: "Graph", permission: "view_analytics" },
      { href: "/app/ecosystem", label: "Ecosystem" },
      { href: "/app/sponsor", label: "Sponsor Intel", permission: "view_sponsorship" },
    ],
  },
  {
    label: "Actions",
    items: [
      { href: "/app/recruit", label: "Recruit", permission: "view_recruit_queue" },
      { href: "/app/risks", label: "Risks", permission: "view_risk_flags" },
      { href: "/app/alerts", label: "Alerts", permission: "view_risk_flags" },
      { href: "/app/playbook", label: "Playbook", permission: "view_analytics" },
      { href: "/app/compare", label: "Compare", permission: "view_compare" },
      { href: "/app/resolve", label: "Resolve", permission: "view_member_status" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/app/advisor", label: "AI Adviser" },
      { href: "/app/exports", label: "Exports", permission: "export_data" },
      { href: "/app/corrections", label: "Corrections" },
      { href: "/app/experiments", label: "Experiments", permission: "view_analytics" },
      { href: "/app/content", label: "Content" },
      { href: "/app/data-health", label: "Data Health", permission: "manage_data" },
      { href: "/app/tour", label: "Tour" },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return TERMINAL_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || hasPermission(role, i.permission)),
  })).filter((g) => g.items.length > 0);
}
