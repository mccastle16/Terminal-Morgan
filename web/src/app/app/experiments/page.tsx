import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/terminal/roles";
import { Card, PageHeader } from "@/components/terminal/ui";
import { ExperimentsClient } from "./experiments-client";

export const metadata: Metadata = { title: "Experiments — CO_ Network" };

// Experiment Lab — gated on view_analytics. Read-only view over the
// pre-computed Monte Carlo simulation (public/ldata/experiment_results.json),
// fetched client-side because of its size (~634 KB).
export default async function ExperimentsPage() {
  const session = await getSession();
  if (!hasPermission(session.role, "view_analytics")) {
    return (
      <div>
        <PageHeader section="Tools" title="Experiments" />
        <Card className="mt-8">
          <p className="text-body-sm font-w510 text-mist">
            The Experiment Lab is not available for the {session.role} role.
          </p>
          <p className="mt-1 text-caption text-fog">
            It requires the view_analytics permission (leadership, membership, or admin).
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        section="Tools"
        title="Experiments"
        description="Simulated business-health trajectories and treatment effects from the pre-computed experiment run. Read-only — nothing here re-runs the model."
      />
      <ExperimentsClient />
    </div>
  );
}
