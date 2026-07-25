"use client";

// Network centrality section — network_centrality.json is 1.6 MB, so it is
// fetched client-side with a loading state (never imported server-side).

import { useEffect, useState } from "react";
import { Badge, Card, MonoTag } from "@/components/terminal/ui";

type Influencer = {
  id: string;
  name: string;
  type?: string;
  category?: string;
  neighborhood?: string;
  member?: boolean;
  degree?: number;
  pagerank?: number;
  betweenness?: number;
  community?: number;
  influence_score?: number;
};

type Centrality = {
  total_nodes: number;
  total_links: number;
  num_communities: number;
  top_influencers: Influencer[];
};

function pretty(slug?: string): string {
  return (slug ?? "").replace(/_/g, " ");
}

export function NetworkSection() {
  const [data, setData] = useState<Centrality | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/ldata/network_centrality.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Centrality) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <Card>
        <p className="text-caption text-fog">Loading network centrality…</p>
      </Card>
    );
  }
  if (state === "error" || !data) {
    return (
      <Card>
        <p className="text-caption text-fog">Network centrality data unavailable.</p>
      </Card>
    );
  }

  const top = (data.top_influencers ?? []).slice(0, 15);
  const maxScore = Math.max(...top.map((t) => t.influence_score ?? 0), 0.0001);

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite px-6 py-4">
        <p className="text-body-sm font-w510 text-paper">Top influencers</p>
        <p className="text-label text-ash">
          {data.total_nodes.toLocaleString()} nodes · {data.total_links.toLocaleString()} links ·{" "}
          {data.num_communities} communities
        </p>
      </div>
      <div className="divide-y divide-graphite">
        {top.map((t, i) => (
          <div key={t.id} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-6 py-3">
            <MonoTag>{String(i + 1).padStart(2, "0")}</MonoTag>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-body-sm text-mist">{t.name}</p>
                {t.member && <Badge color="#27a644">Member</Badge>}
              </div>
              <p className="text-label text-ash capitalize">
                {pretty(t.category)}
                {t.community != null && <> · community {t.community}</>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden h-1.5 w-24 rounded-pills bg-white/5 sm:block">
                <div
                  className="h-full rounded-pills bg-iris-violet"
                  style={{ width: `${((t.influence_score ?? 0) / maxScore) * 100}%` }}
                />
              </div>
              <MonoTag>{(t.influence_score ?? 0).toFixed(3)}</MonoTag>
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-graphite px-6 py-3 text-label text-ash">
        Influence = composite of PageRank, betweenness, and degree across the relationship graph.
      </p>
    </Card>
  );
}
