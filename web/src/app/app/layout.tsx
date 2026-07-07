import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { getBusinessBySlug } from "@/lib/data";

// The authenticated shell. Session resolution order:
//   1. Supabase session (once the project is live) -> accounts.business_id
//   2. Preview cookie (sample data, clearly bannered)
//   3. Neither -> /login
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const previewSlug = cookieStore.get("conet_preview")?.value;
  const business = previewSlug ? getBusinessBySlug(previewSlug) : null;

  if (!business) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      {/* Preview banner — honest about sample data (Ash = allowed subtle surface) */}
      <div className="bg-ash">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 py-2">
          <p className="text-caption font-normal text-obsidian">
            Preview — you’re viewing the owner dashboard for{" "}
            <span className="font-medium">{business.name}</span> with sample data. Claiming and
            corrections open with accounts.
          </p>
          <Link
            href="/app/signout"
            className="shrink-0 rounded-links text-caption font-medium text-obsidian underline decoration-hairline underline-offset-4 hover:decoration-obsidian"
          >
            Exit preview
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 gap-12 px-6 py-10">
        <AppSidebar publicSlug={business.slug} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
