import Link from "next/link";
import type { Business } from "@/lib/data";
import { getCategoryLabel } from "@/lib/data";

// Text-first rating — the number carries the signal in Mist at weight 510,
// the count sits quietly in Fog. No stars, no icons.
export function Rating({ rating, count }: { rating: number | null; count: number | null }) {
  if (rating == null) {
    return <span className="text-caption font-normal text-ash">No rating yet</span>;
  }
  return (
    <span className="text-caption text-mist">
      <span className="font-w510">{rating.toFixed(1)}</span>
      {count != null && <span className="font-normal text-fog"> ({count})</span>}
    </span>
  );
}

// Badge-style chip with the sanctioned pulse-green supporting accent.
export function ChamberChip() {
  return (
    <span
      className="inline-flex items-center rounded-badges bg-white/5 px-1.5 py-px text-label"
      style={{ color: "var(--color-pulse-green)" }}
    >
      Chamber member
    </span>
  );
}

// Hairline-divided list row — Linear favors index-like lists over card grids.
// The row is a link with a faint white-wash hover surface.
export function BusinessRow({ business, note }: { business: Business; note?: string }) {
  return (
    <Link
      href={`/b/${business.slug}`}
      className="group -mx-3 flex cursor-pointer items-baseline justify-between gap-4 rounded-buttons px-3 py-4 transition-colors duration-150 hover:bg-white/[0.03]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-sm font-w510 text-mist transition-colors duration-150 group-hover:text-paper">
            {business.name}
          </span>
          {business.chamber_member === true && <ChamberChip />}
        </div>
        <p className="mt-1 text-caption font-normal text-fog">
          {getCategoryLabel(business.category_slug)}
          {business.neighborhood_label && <> · {business.neighborhood_label}</>}
          {note && <span className="text-ash"> · {note}</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Rating rating={business.rating} count={business.review_count} />
      </div>
    </Link>
  );
}

export function BusinessList({
  items,
  notes,
}: {
  items: Business[];
  notes?: (string | undefined)[];
}) {
  return (
    <ul className="divide-y divide-graphite">
      {items.map((b, i) => (
        <li key={b.id}>
          <BusinessRow business={b} note={notes?.[i]} />
        </li>
      ))}
    </ul>
  );
}
