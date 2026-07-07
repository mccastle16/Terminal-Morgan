import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Log in — CO_ Network",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-8 pt-16">
        <div className="mx-auto max-w-sm">
          <h1 className="text-heading font-semibold text-obsidian">Log in</h1>
          <p className="mt-2 text-body font-normal text-graphite">
            Manage your business profile, corrections, and connections.
          </p>
          <AuthForm mode="login" />
          <p className="mt-8 text-label font-normal text-graphite">
            New here?{" "}
            <Link
              href="/signup"
              className="rounded-links font-medium text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
            >
              Create an account
            </Link>{" "}
            — or{" "}
            <Link
              href="/app/preview"
              className="rounded-links font-medium text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
            >
              explore the preview
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
