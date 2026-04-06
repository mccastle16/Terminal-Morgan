// Role definitions and permission matrix
// Maps to the tiered access model from terminal_master_docs.md

export const ROLES = {
  leadership: {
    id: 'leadership',
    label: 'Leadership',
    description: 'Chamber CEO, President, Board — full market map and strategy',
    permissions: [
      'view_all_businesses',
      'view_member_status',
      'view_non_member_details',
      'view_risk_flags',
      'view_recruit_queue',
      'view_analytics',
      'view_compare',
      'view_market_intel',
      'export_data',
      'export_reports',
      'view_sponsorship',
      'view_data_quality',
      'view_reviews',
      'view_actions',
    ],
  },
  membership: {
    id: 'membership',
    label: 'Membership Director',
    description: 'Membership growth and outreach — recruit queue focus',
    permissions: [
      'view_all_businesses',
      'view_member_status',
      'view_non_member_details',
      'view_recruit_queue',
      'view_analytics',
      'view_compare',
      'export_data',
      'manage_recruit_actions',
      'view_reviews',
      'view_actions',
    ],
  },
  member: {
    id: 'member',
    label: 'Chamber Member',
    description: 'Own profile, peer compare, category intel',
    permissions: [
      'view_own_profile',
      'view_peer_compare',
      'view_category_analytics',
      'view_neighborhood_snapshot',
      'view_limited_market',
      'view_reviews',
    ],
  },
  teaser: {
    id: 'teaser',
    label: 'Non-Member',
    description: 'Limited preview — conversion target',
    permissions: [
      'view_own_profile_limited',
      'view_market_summary',
    ],
  },
  sponsor: {
    id: 'sponsor',
    label: 'Sponsor / Partner',
    description: 'Aggregated audience and category intelligence',
    permissions: [
      'view_category_analytics',
      'view_audience_segments',
      'view_sponsorship',
    ],
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Data QA, refresh status, tenant settings',
    permissions: [
      'view_all_businesses',
      'view_member_status',
      'view_non_member_details',
      'view_risk_flags',
      'view_recruit_queue',
      'view_analytics',
      'view_compare',
      'view_market_intel',
      'export_data',
      'export_reports',
      'view_sponsorship',
      'view_data_quality',
      'manage_tenant',
      'manage_users',
      'manage_data_refresh',
      'manage_data',
      'view_reviews',
      'view_actions',
    ],
  },
}

export const TERMINAL_USERS = {
  'ceo@cgcc.org':        { password: 'terminal2026', name: 'Maria Gonzalez',   role: 'leadership', title: 'President & CEO' },
  'membership@cgcc.org': { password: 'terminal2026', name: 'David Morales',    role: 'membership', title: 'Membership Director' },
  'member@cgcc.org':     { password: 'terminal2026', name: 'Sofia Reyes',      role: 'member',     title: 'Business Owner', businessId: 'bulla_gastrobar' },
  'guest@cgcc.org':      { password: 'guest',        name: 'Guest User',       role: 'teaser',     title: 'Non-Member' },
  'sponsor@cgcc.org':    { password: 'terminal2026', name: 'James Chen',       role: 'sponsor',    title: 'Sponsor Rep' },
  'admin@cgcc.org':      { password: 'terminal2026', name: 'Admin',            role: 'admin',      title: 'System Admin' },
}

export function hasPermission(role, permission) {
  const roleDef = ROLES[role]
  if (!roleDef) return false
  return roleDef.permissions.includes(permission)
}

export function getRoleConfig(roleId) {
  return ROLES[roleId] || ROLES.teaser
}
