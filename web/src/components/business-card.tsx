import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { Business } from "@/lib/data";
import { getCategoryLabel } from "@/lib/data";

export function Rating({ rating, count }: { rating: number | null; count: number | null }) {
  if (rating == null) {
    return <span className="text-xs text-slate-500">No rating yet</span>;
  }
  return (
    <span className="flex items-center gap-1 text-sm">
      <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-semibold text-slate-100">{rating.toFixed(1)}</span>
      {count != null && <span className="text-xs text-slate-500">({count})</span>}
    </span>
  );
}

export function BusinessCard({ business, note }: { business: Business; note?: string }) {
  return (
    <Link
      href={`/b/${business.slug}`}
      className="group flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900 hover:shadow-lg hover:shadow-black/30"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-slate-100 transition-colors group-hover:text-amber-400">
          {business.name}
        </h3>
        {business.chamber_member === true && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400"
            title="Coral Gables Chamber of Commerce member"
          >
            <BadgeCheck size={11} aria-hidden /> Chamber
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">
        {getCategoryLabel(business.category_slug)}
        {business.price_tier && !business.price_tier_inferred && (
          <span className="text-slate-500"> · {business.price_tier}</span>
        )}
      </p>
      <div className="mt-auto flex items-center justify-between pt-1">
        <Rating rating={business.rating} count={business.review_count} />
        {business.neighborhood_label && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} aria-hidden />
            {business.neighborhood_label}
          </span>
        )}
      </div>
      {note && <p className="text-[11px] text-slate-500">{note}</p>}
    </Link>
  );
}
