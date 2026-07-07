import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { ROLES, type Role } from "@/lib/terminal/roles";

export const metadata: Metadata = {
  title: "Log in — CO_ Network",
};

// Quick access mirrors the legacy login's role cards — enters the terminal
// preview with that role's filtered view (cookie-based until Supabase auth).
const QUICK_ACCESS: Role[] = ["leadership", "membership", "member", "nonmember", "admin"];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-void">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-20">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-16 md:grid-cols-2">
          <div>
            <h1 className="text-heading-sm font-w510 text-paper">Log in</h1>
            <p className="mt-2 text-body-sm text-fog">
              Access your market intelligence terminal.
            </p>
            <AuthForm mode="login" />
            <p className="mt-8 text-caption text-fog">
              New here?{" "}
              <Link href="/signup" className="text-mist underline decoration-graphite underline-offset-4 hover:decoration-mist">
                Create an account
              </Link>
            </p>
          </div>

          <div className="pt-2 md:pt-12">
            <p className="text-label font-w510 uppercase tracking-wide text-ash">
              Quick access · preview
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {QUICK_ACCESS.map((role) => (
                <a
                  key={role}
                  href={`/app/preview?role=${role}`}
                  className="group flex items-baseline justify-between gap-4 rounded-buttons border border-graphite px-4 py-3 transition-colors duration-150 hover:border-smoke hover:bg-white/[0.03]"
                >
                  <span className="text-caption font-w510 text-mist group-hover:text-paper">
                    {ROLES[role].label}
                  </span>
                  <span className="truncate text-label text-ash">
                    {ROLES[role].description}
                  </span>
                </a>
              ))}
            </div>
            <p className="mt-3 text-label text-ash">
              Sample data. Each role sees a different slice of the terminal.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
