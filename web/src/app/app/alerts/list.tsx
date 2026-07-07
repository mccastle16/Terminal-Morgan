"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  MonoTag,
  SectionLabel,
  ghostBtnCls,
} from "@/components/terminal/ui";

export type Alert = {
  id: string;
  severity: "critical" | "operational" | "info";
  title: string;
  detail: string;
  count: number;
};

const STORAGE_KEY = "conet_alerts_dismissed";

function severityColor(severity: Alert["severity"]): string | undefined {
  if (severity === "critical") return "var(--color-coral-red)";
  if (severity === "operational") return "var(--color-lavender)";
  return undefined; // info — default fog
}

// Dismissals live in localStorage only; the alerts themselves are recomputed
// server-side on every request, so a dismissed rule reappears here (still
// hidden) with fresh numbers rather than going stale.
export function AlertList({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDismissed(parsed.filter((v): v is string => typeof v === "string"));
        }
      }
    } catch {
      // ignore unreadable storage
    }
  }, []);

  const persist = (next: string[]) => {
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — dismissals just won't survive reload
    }
  };

  const visible = alerts.filter((a) => !dismissed.includes(a.id));
  const hiddenCount = alerts.length - visible.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Recomputed on every visit</SectionLabel>
        {hiddenCount > 0 && (
          <button type="button" className={ghostBtnCls()} onClick={() => persist([])}>
            Restore {hiddenCount} dismissed
          </button>
        )}
      </div>

      <Card padded={false}>
        <div className="divide-y divide-graphite">
          {visible.map((alert) => (
            <div key={alert.id} className="flex items-start gap-4 px-6 py-4">
              <div className="w-24 shrink-0 pt-0.5">
                <Badge color={severityColor(alert.severity)}>{alert.severity}</Badge>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-mist">{alert.title}</p>
                <p className="mt-0.5 text-caption text-fog">{alert.detail}</p>
              </div>
              <div className="shrink-0 pt-0.5">
                <MonoTag>{alert.count.toLocaleString()}</MonoTag>
              </div>
              <button
                type="button"
                className={ghostBtnCls()}
                onClick={() => persist([...dismissed, alert.id])}
              >
                Dismiss
              </button>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="px-6 py-10 text-center text-caption text-fog">
              {alerts.length === 0
                ? "No active alerts — the snapshot is clean by every rule."
                : "All alerts dismissed. They stay hidden in this browser until restored."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
