import Link from "next/link";
import type { Business } from "@/lib/data";
import { getCategoryLabel } from "@/lib/data";

// Text-first rating — DESIGN.md is monochrome and icon-averse; the number
// carries the signal, the count sits in Graphite.
export function Rating({ rating, count }: { rating: number | null; count: number | null }) {
  if (rating == null) {
    return <span className="text-caption font-normal text-smoke">No rating yet</span>;
  }
  return (
    <span className="text-label text-obsidian">
      <span className="font-medium">{rating.toFixed(1)}</span>
      {count != null && <span className="font-normal text-graphite"> ({count})</span>}
    </span>
  );
}

export function ChamberChip() {
  return (
    <span className="rounded-full border border-hairline px-2.5 py-0.5 text-caption font-medium text-graphite">
      Chamber member
    </span>
  );
}

// Editorial list row — DESIGN.md favors index-like compositions over card
// grids. Structure comes from a single hairline divider and whitespace; the
// row is a link with a Whisper hover surface.
export function BusinessRow({ business, note }: { business: Business; note?: string }) {
  return (
    <Link
      href={`/b/${business.slug}`}
      className="group -mx-3 flex items-baseline justify-between gap-4 rounded-cards px-3 py-4 transition-colors duration-200 hover:bg-whisper"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-lg font-medium text-obsidian">{business.name}</span>
          {business.chamber_member === true && <ChamberChip />}
        </div>
        <p className="mt-1 text-label font-normal text-graphite">
          {getCategoryLabel(business.category_slug)}
          {business.neighborhood_label && <> · {business.neighborhood_label}</>}
          {note && <span className="text-smoke"> · {note}</span>}
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
    <ul className="divide-y divide-hairline">
      {items.map((b, i) => (
        <li key={b.id}>
          <BusinessRow business={b} note={notes?.[i]} />
        </li>
      ))}
    </ul>
  );
}
