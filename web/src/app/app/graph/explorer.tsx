"use client";

// Graph explorer — analytics_queries.json is 1 MB, so it is fetched
// client-side with a loading state. The force graph renders ONLY the selected
// query's subgraph. react-force-graph-2d is browser-only → next/dynamic ssr:false.

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import nextDynamic from "next/dynamic";
import type { ForceGraphProps, NodeObject } from "react-force-graph-2d";
import { Card, EmptyState, MonoTag, inputCls } from "@/components/terminal/ui";

const ForceGraph2D = nextDynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <p className="px-6 py-8 text-caption text-fog">Preparing canvas…</p>
  ),
}) as unknown as ComponentType<ForceGraphProps>;

// Node colors per chart rules: businesses mist, categories iris, hoods green.
const NODE_COLORS: Record<string, string> = {
  business: "#d0d6e0",
  category: "#6366f1",
  neighborhood: "#27a644",
};

type QueryNode = {
  id: string;
  name?: string;
  type?: string;
};

type QueryLink = { source: string; target: string; type?: string };

type CannedQuery = {
  id: string;
  title: string;
  description?: string;
  category: string;
  graph?: { nodes?: QueryNode[]; links?: QueryLink[] };
  table?: Record<string, string | number | boolean | null>[];
  columns?: string[];
  nodeCount?: number;
  linkCount?: number;
  rowCount?: number;
};

function cellText(v: string | number | boolean | null | undefined): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return v;
}

function paintNode(
  node: NodeObject,
  ctx: CanvasRenderingContext2D,
  globalScale: number
) {
  if (node.x == null || node.y == null) return;
  const type = typeof node.type === "string" ? node.type : "business";
  const r = type === "category" ? 4 : type === "neighborhood" ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = NODE_COLORS[type] ?? "#8a8f98";
  ctx.fill();
  if (globalScale > 1.6) {
    const label = typeof node.name === "string" ? node.name : String(node.id ?? "");
    ctx.font = `${Math.max(3, 10 / globalScale)}px sans-serif`;
    ctx.fillStyle = "#8a8f98";
    ctx.textAlign = "center";
    ctx.fillText(label, node.x, node.y + r + 8 / globalScale);
  }
}

export function GraphExplorer() {
  const [queries, setQueries] = useState<CannedQuery[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Measure the canvas container — the force graph needs explicit pixels.
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/ldata/analytics_queries.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: CannedQuery[]) => {
        if (cancelled) return;
        setQueries(d);
        if (d.length > 0) setSelectedId(d[0].id);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const measure = () => setCanvasW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state]);

  const selected = useMemo(
    () => queries.find((q) => q.id === selectedId) ?? null,
    [queries, selectedId]
  );

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? queries.filter(
          (x) =>
            x.title.toLowerCase().includes(q) ||
            (x.description ?? "").toLowerCase().includes(q)
        )
      : queries;
    const map = new Map<string, CannedQuery[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [queries, search]);

  // Clone per selection — the force engine mutates nodes/links in place.
  const graphData = useMemo(() => {
    if (!selected?.graph) return { nodes: [], links: [] };
    return {
      nodes: (selected.graph.nodes ?? []).map((n) => ({ ...n })),
      links: (selected.graph.links ?? []).map((l) => ({ ...l })),
    };
  }, [selected]);

  if (state === "loading") {
    return (
      <Card>
        <p className="text-caption text-fog">Loading canned queries…</p>
      </Card>
    );
  }
  if (state === "error") {
    return (
      <EmptyState
        title="Graph data unavailable"
        detail="analytics_queries.json failed to load."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* Query list */}
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search queries…"
          aria-label="Search queries"
          className={inputCls()}
        />
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {groups.map(([category, items]) => (
            <div key={category}>
              <p className="px-1 text-label font-w510 uppercase tracking-wide text-ash">
                {category}
              </p>
              <div className="mt-1.5 space-y-1">
                {items.map((q) => {
                  const active = q.id === selectedId;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedId(q.id)}
                      className={`w-full cursor-pointer rounded-buttons px-3 py-2 text-left transition-colors duration-150 ${
                        active
                          ? "bg-white/5 text-paper"
                          : "text-fog hover:bg-white/[0.03] hover:text-mist"
                      }`}
                    >
                      <span className="block truncate text-caption">{q.title}</span>
                      <span className="mt-0.5 block text-label text-ash">
                        {q.nodeCount ?? 0} nodes · {q.linkCount ?? 0} links
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="px-1 text-caption text-fog">No queries match “{search}”.</p>
          )}
        </div>
      </div>

      {/* Selected query: graph + table */}
      <div className="min-w-0 space-y-4">
        {selected ? (
          <>
            <Card padded={false}>
              <div className="border-b border-graphite px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-body-sm font-w510 text-paper">{selected.title}</p>
                  <MonoTag>
                    {selected.nodeCount ?? 0}n · {selected.linkCount ?? 0}l
                  </MonoTag>
                </div>
                {selected.description && (
                  <p className="mt-1 text-caption text-fog">{selected.description}</p>
                )}
              </div>
              <div ref={canvasWrapRef} className="h-[480px] w-full overflow-hidden bg-void">
                {graphData.nodes.length > 0 ? (
                  canvasW > 0 && (
                    <ForceGraph2D
                      key={selected.id}
                      graphData={graphData}
                      width={canvasW}
                      height={480}
                      backgroundColor="#08090a"
                      nodeCanvasObject={paintNode}
                      linkColor={() => "rgba(255,255,255,0.08)"}
                      linkWidth={0.5}
                      cooldownTicks={90}
                      enableZoomInteraction
                      enablePanInteraction
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-caption text-fog">No subgraph for this query.</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-graphite px-6 py-3">
                {(
                  [
                    ["business", "Businesses"],
                    ["category", "Categories"],
                    ["neighborhood", "Neighborhoods"],
                  ] as const
                ).map(([key, label]) => (
                  <span key={key} className="inline-flex items-center gap-1.5 text-label text-fog">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-pills"
                      style={{ backgroundColor: NODE_COLORS[key] }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </Card>

            <Card padded={false}>
              <div className="border-b border-graphite px-6 py-4">
                <p className="text-body-sm font-w510 text-paper">Result table</p>
                <p className="mt-1 text-label text-ash">
                  {selected.table
                    ? `Showing ${Math.min(50, selected.table.length)} of ${selected.table.length} rows`
                    : "No table for this query"}
                </p>
              </div>
              {selected.table && selected.table.length > 0 && selected.columns ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-graphite">
                        {selected.columns.map((col) => (
                          <th
                            key={col}
                            className="px-6 py-3 text-left text-label font-w510 uppercase tracking-wide text-ash"
                          >
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-graphite">
                      {selected.table.slice(0, 50).map((row, i) => (
                        <tr key={i} className="transition-colors duration-150 hover:bg-white/[0.02]">
                          {selected.columns!.map((col) => (
                            <td
                              key={col}
                              className="whitespace-nowrap px-6 py-2.5 text-caption text-mist"
                            >
                              {cellText(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-6 py-6 text-caption text-fog">Nothing tabular here.</p>
              )}
            </Card>
          </>
        ) : (
          <EmptyState title="Select a query" detail="Pick a canned query from the list to explore its subgraph." />
        )}
      </div>
    </div>
  );
}
