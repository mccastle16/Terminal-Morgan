import Link from "next/link";
import { TerminalSidebar } from "@/components/terminal/sidebar";
import { getSession } from "@/lib/session";
import { navForRole, ROLES } from "@/lib/terminal/roles";

// The terminal shell — ChatGPT×Linear: collapsible chats-first sidebar on a
// Carbon rail, content on the Void canvas. Nav is filtered by the session
// role (legacy permission matrix, lib/terminal/roles.ts). getSession()
// redirects to /login when no session exists.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const nav = navForRole(session.role);

  return (
    <div className="flex min-h-screen bg-void">
      <TerminalSidebar
        nav={nav}
        roleLabel={ROLES[session.role].label}
        businessName={session.business.name}
      />

      <div className="min-w-0 flex-1">
        {/* Preview notice — quiet, one line */}
        <div className="flex items-center justify-between gap-4 border-b border-graphite px-6 py-2">
          <p className="truncate text-label text-ash">
            Preview · {ROLES[session.role].label} view
            {(session.role === "member" || session.role === "nonmember") && (
              <> · {session.business.name}</>
            )}
            {" · sample data — accounts open with launch"}
          </p>
          <Link
            href="/"
            className="shrink-0 text-label text-fog transition-colors duration-150 hover:text-mist"
          >
            co-network.com
          </Link>
        </div>

        <main className="mx-auto w-full max-w-[1200px] px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
