import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { hasPermission, ROLES } from "@/lib/terminal/roles";
import { PageHeader } from "@/components/terminal/ui";
import { TourClient } from "./tour-client";

export const metadata: Metadata = { title: "Tour — CO_ Network" };

// Tour — a six-step walkthrough of THIS terminal (not the legacy dashboard),
// available to every role. Step completion is remembered per browser.
export default async function TourPage() {
  const session = await getSession();

  return (
    <div>
      <PageHeader
        section="Tools"
        title="Tour"
        description={`Six stops through the terminal, in the order they pay off. You are viewing as ${ROLES[session.role].label} — some tabs vary by role.`}
      />
      <TourClient
        canRecruit={hasPermission(session.role, "view_recruit_queue")}
        canAnalytics={hasPermission(session.role, "view_analytics")}
      />
    </div>
  );
}
