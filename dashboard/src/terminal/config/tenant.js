// Tenant configuration — one config per chamber/city deployment
// Coral Gables is the proof-of-concept tenant

const TENANTS = {
  coral_gables: {
    id: 'coral_gables',
    name: 'Coral Gables Chamber of Commerce',
    shortName: 'CGCC',
    city: 'Coral Gables',
    state: 'FL',
    zipcodes: ['33134', '33146', '33133', '33143'],
    boundingBox: {
      north: 25.77,
      south: 25.69,
      east: -80.24,
      west: -80.30,
    },
    neighborhoods: [
      'Miracle Mile',
      'Giralda Plaza',
      'Merrick Park',
      'Alhambra Circle',
      'Ponce de Leon Corridor',
      'Douglas Road Corridor',
      'Bird Road Corridor',
      'Sunset / South Gables',
      'University of Miami Area',
      'Coral Gables',
    ],
    categories: [
      'food_beverage', 'retail', 'education', 'healthcare', 'legal',
      'accounting', 'professional_services', 'wellness', 'construction',
      'hospitality', 'personal_services', 'nonprofit', 'marketing',
      'banking', 'financial_services', 'insurance', 'auto_dealer',
      'arts_culture', 'real_estate', 'consulting', 'technology', 'other',
    ],
    branding: {
      primaryColor: '#1e3a5f',
      accentColor: '#c9a227',
      logo: null,
    },
    dataSource: '/data/union_all_businesses.csv',
    refreshCadence: 'monthly',
    lastRefresh: '2026-03-02',
  },
}

export const DEFAULT_TENANT = 'coral_gables'

export function getTenant(tenantId = DEFAULT_TENANT) {
  return TENANTS[tenantId] || TENANTS[DEFAULT_TENANT]
}

export function getAllTenants() {
  return Object.values(TENANTS)
}

export default TENANTS
