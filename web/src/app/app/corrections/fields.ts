// Correctable fields — shared between the server page (which serializes
// current values in this order) and the client form. 11 fields, mirroring the
// legacy CorrectionPage list mapped onto the new schema.

export const CORRECTION_FIELDS = [
  "Business name",
  "Category",
  "Neighborhood",
  "Address",
  "Postcode",
  "Phone",
  "Website",
  "Price tier",
  "Rating",
  "Review count",
  "Status",
] as const;

export type CorrectionBusiness = {
  slug: string;
  name: string;
  /** Display values aligned with CORRECTION_FIELDS; "" = empty. */
  values: string[];
};
