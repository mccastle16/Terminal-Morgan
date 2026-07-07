import Link from "next/link";
import type { Metadata } from "next";
import { getSessionBusiness } from "@/lib/session";
import { getCategoryLabel, getNearby, getSimilar, type Connection } from "@/lib/data";

export const metadata: Metadata = { title: "Connections — CO_ Network" };

// The ego-graph as a list: every suggestion explains WHY it exists, and the
// owner decides what sticks (confirm/reject — the flywheel, REBUILD-PLAN D3).
// Buttons are inert in preview; they write to the edges table with accounts.

function ConnectionRows({ connections }: { connections: Connection[] }) {
  return (
    <ul className="divide-y divide-hairline">
      {connections.map((c) => (
        <li key={c.business.id} className="flex items-center gap-6 py-4">
          <div className="min-w-0 flex-1">
            <Link
              href={`/b/${c.business.slug}`}
              className="rounded-links text-body-lg font-medium text-obsidian underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-hairline"
            >
              {c.business.name}
            </Link>
            <p className="mt-0.5 text-label font-normal text-graphite">
              {getCategoryLabel(c.business.category_slug)} · {c.reason}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <span
              className="cursor-default rounded-full border border-hairline px-4 py-1 text-caption font-medium text-smoke"
              title="Opens with verified accounts"
            >
              Confirm
            </span>
            <span
              className="cursor-default rounded-full px-3 py-1 text-caption font-medium text-smoke"
              title="Opens with verified accounts"
            >
              Dismiss
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ConnectionsPage() {
  const business = await getSessionBusiness();
  const nearby = getNearby(business, 200, 8);
  const similar = getSimilar(business, 8);

  return (
    <div>
      <p className="text-label font-medium text-graphite">Connections</p>
      <h1 className="mt-1 text-heading font-semibold text-obsidian">Your local network</h1>
      <p className="mt-2 max-w-xl text-body font-normal text-graphite">
        Suggested from real signals — proximity, category, shared context. Confirm the ones that
        matter; confirmed connections appear on your public page. Every suggestion says why it
        was made.
      </p>

      {nearby.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-subheading font-medium text-obsidian">Neighbors</h2>
          <p className="mt-1 text-label font-normal text-graphite">
            Within a two-minute walk of your door.
          </p>
          <div className="mt-3 border-t border-hairline">
            <ConnectionRows connections={nearby} />
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-subheading font-medium text-obsidian">Same field, same area</h2>
          <p className="mt-1 text-label font-normal text-graphite">
            Peers worth knowing — for referrals, benchmarking, or simply awareness.
          </p>
          <div className="mt-3 border-t border-hairline">
            <ConnectionRows connections={similar} />
          </div>
        </section>
      )}

      {nearby.length === 0 && similar.length === 0 && (
        <p className="mt-10 max-w-xl text-body font-normal text-graphite">
          No high-confidence suggestions yet — this usually means the business doesn’t have an
          exact map location on file. Correcting your address will unlock proximity connections.
        </p>
      )}

      <p className="mt-10 max-w-xl text-caption font-normal leading-relaxed text-smoke">
        Confirm and dismiss are disabled in preview. Complementary-service matching (who needs
        what you offer) arrives after launch.
      </p>
    </div>
  );
}
