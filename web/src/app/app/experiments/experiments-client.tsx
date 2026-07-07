"use client";

// Experiment Lab client — fetches the pre-computed simulation output and
// renders BHS summary stats, the treatment-effect ranking (6 actions), and a
// per-business recommendation + projected trajectory. Div-bars only.

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Card,
  inputCls,
  MonoTag,
  SectionLabel,
  StatCard,
} from "@/components/terminal/ui";

type Treatment = {
  action_name: string;
  description: string;
  mu_delta: number;
  sigma: number;
  success_rate: number;
  n_treated: number;
  n_control: number;
  component: string;
};

type TrajPoint = {
  month: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

type ExpBusiness = {
  business_id: string;
  business_name: string;
  category: string;
  neighborhood: string | null;
  bhs: number;
  bhs_components: Record<string, number>;
  improvement_potential: number;
  baseline?: {
    trajectory?: TrajPoint[];
    bhs_start?: number;
    bhs_end_median?: number;
    bhs_end_p10?: number;
    bhs_end_p90?: number;
    prob_improve?: number;
  };
  paths?: {
    action_id?: string;
    action_name?: string;
    description?: string;
    empirical_delta?: number;
    empirical_success_rate?: number;
  }[];
  q_recommendation?: {
    best_action?: string;
    best_action_name?: string;
    q_value?: number;
  } | null;
};

type ExpData = {
  generated_at?: string;
  config: { n_paths: number; horizon_months: number };
  bhs_distribution: { mean: number; std: number; p10: number; p50: number; p90: number };
  treatment_effects: Record<string, Treatment>;
  businesses: ExpBusiness[];
};

export function ExperimentsClient() {
  const [data, setData] = useState<ExpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/ldata/experiment_results.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ExpData>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const treatments = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.treatment_effects)
      .map(([key, t]) => ({ key, ...t }))
      .sort((a, z) => z.mu_delta - a.mu_delta);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.businesses
      .filter(
        (b) =>
          !q ||
          b.business_name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
      )
      .sort((a, z) => z.bhs - a.bhs);
  }, [data, query]);

  const selected = useMemo(
    () => data?.businesses.find((b) => b.business_id === selectedId) ?? null,
    [data, selectedId]
  );

  if (error) {
    return (
      <Card className="mt-8">
        <p className="text-body-sm font-w510 text-mist">Could not load experiment data</p>
        <p className="mt-1 text-caption text-fog">{error} — /ldata/experiment_results.json</p>
      </Card>
    );
  }
  if (!data) {
    return <p className="mt-8 text-caption text-fog">Loading experiment results…</p>;
  }

  const bhs = data.bhs_distribution;
  const maxDelta = Math.max(1, ...treatments.map((t) => Math.abs(t.mu_delta)));

  return (
    <div className="mt-8 space-y-10">
      {/* BHS distribution */}
      <section>
        <SectionLabel>Business Health Score distribution</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Mean" value={bhs.mean.toFixed(1)} />
          <StatCard label="Std dev" value={`±${bhs.std.toFixed(1)}`} />
          <StatCard label="P10" value={bhs.p10.toFixed(1)} />
          <StatCard label="Median" value={bhs.p50.toFixed(1)} />
          <StatCard label="P90" value={bhs.p90.toFixed(1)} />
        </div>
      </section>

      {/* Treatment effects */}
      <section>
        <SectionLabel>Treatment effects — ranked</SectionLabel>
        <Card className="mt-3" padded={false}>
          <div className="divide-y divide-graphite">
            {treatments.map((t) => (
              <div key={t.key} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-caption font-w510 text-mist">{t.action_name}</p>
                  <MonoTag>
                    {t.mu_delta > 0 ? "+" : ""}
                    {t.mu_delta.toFixed(1)} BHS
                  </MonoTag>
                </div>
                <p className="mt-0.5 text-label text-fog">{t.description}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="h-1.5 flex-1 rounded-pills bg-white/[0.06]">
                    <span
                      className="block h-1.5 rounded-pills bg-mist"
                      style={{
                        width: `${Math.max(1, (Math.abs(t.mu_delta) / maxDelta) * 100)}%`,
                      }}
                      aria-hidden
                    />
                  </span>
                  <span className="shrink-0 text-label text-ash">
                    {(t.success_rate * 100).toFixed(0)}% success ·{" "}
                    {t.n_treated.toLocaleString("en-US")} treated · {t.component}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Business lookup */}
      <section>
        <SectionLabel>Business paths ({data.businesses.length} simulated)</SectionLabel>
        <div className="relative mt-3 max-w-md">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search simulated businesses…"
            className={inputCls() + " pl-9"}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 9).map((b) => {
            const active = b.business_id === selectedId;
            return (
              <button
                key={b.business_id}
                onClick={() => setSelectedId(active ? null : b.business_id)}
                className={`cursor-pointer rounded-cards bg-carbon p-4 text-left shadow-subtle transition-colors duration-150 ${
                  active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                }`}
              >
                <p className="truncate text-caption font-w510 text-mist">{b.business_name}</p>
                <p className="mt-0.5 truncate text-label text-fog">
                  {b.category.replace(/_/g, " ")}
                  {b.neighborhood ? ` · ${b.neighborhood}` : ""}
                </p>
                <p className="mt-2 text-body-lg font-w510 text-paper">{b.bhs.toFixed(1)}</p>
                <p className="text-label text-ash">
                  BHS · +{b.improvement_potential.toFixed(1)} potential
                </p>
              </button>
            );
          })}
        </div>

        {selected && (
          <Card className="mt-4">
            <p className="text-body-sm font-w510 text-paper">{selected.business_name}</p>
            <p className="mt-0.5 text-caption text-fog">
              {selected.category.replace(/_/g, " ")}
              {selected.neighborhood ? ` · ${selected.neighborhood}` : ""} · BHS{" "}
              {selected.bhs.toFixed(1)}
            </p>

            {selected.q_recommendation?.best_action_name && (
              <div className="mt-4 rounded-buttons bg-white/[0.03] px-4 py-3">
                <p className="text-label font-w510 uppercase tracking-wide text-ash">
                  Recommended action
                </p>
                <p className="mt-1 text-caption font-w510 text-mist">
                  {selected.q_recommendation.best_action_name}
                </p>
                {selected.q_recommendation.q_value != null && (
                  <p className="mt-0.5 text-label text-fog">
                    Q-value {selected.q_recommendation.q_value.toFixed(1)} — highest expected
                    long-run BHS gain in the simulation
                  </p>
                )}
              </div>
            )}

            {selected.baseline?.trajectory && selected.baseline.trajectory.length > 0 && (
              <div className="mt-5">
                <p className="text-label font-w510 uppercase tracking-wide text-ash">
                  Projected baseline trajectory (median, 12 months)
                </p>
                <div className="mt-2 space-y-1.5">
                  {selected.baseline.trajectory.map((p) => (
                    <div key={p.month} className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-label text-fog">M{p.month}</span>
                      <span className="h-1.5 flex-1 rounded-pills bg-white/[0.06]">
                        <span
                          className="block h-1.5 rounded-pills bg-mist"
                          style={{ width: `${Math.min(100, Math.max(1, p.p50))}%` }}
                          aria-hidden
                        />
                      </span>
                      <span className="w-24 shrink-0 text-right">
                        <MonoTag>
                          {p.p50.toFixed(1)} ({p.p10.toFixed(0)}–{p.p90.toFixed(0)})
                        </MonoTag>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.paths && selected.paths.length > 0 && (
              <div className="mt-5">
                <p className="text-label font-w510 uppercase tracking-wide text-ash">
                  Top strategy paths
                </p>
                <div className="mt-2 divide-y divide-graphite">
                  {selected.paths.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-caption text-mist">
                          {p.action_name ?? p.action_id ?? `Path ${i + 1}`}
                        </p>
                        {p.description && (
                          <p className="truncate text-label text-fog">{p.description}</p>
                        )}
                      </div>
                      <MonoTag>
                        {(p.empirical_delta ?? 0) > 0 ? "+" : ""}
                        {(p.empirical_delta ?? 0).toFixed(1)} BHS
                      </MonoTag>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        <p className="mt-4 text-label text-ash">
          Pre-computed Monte Carlo simulation — {data.config.n_paths.toLocaleString("en-US")}{" "}
          paths over a {data.config.horizon_months}-month horizon. Effects come from
          observational data: correlational, not causal.
        </p>
      </section>
    </div>
  );
}
