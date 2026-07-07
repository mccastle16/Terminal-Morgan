import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBusinessBySlug, type Business } from "@/lib/data";

// Resolves the signed-in owner's business. Today: the preview cookie.
// At Supabase cutover: auth session -> accounts.business_id, with the
// preview cookie kept as the logged-out demo path.
export async function getSessionBusiness(): Promise<Business> {
  const cookieStore = await cookies();
  const slug = cookieStore.get("conet_preview")?.value;
  const business = slug ? getBusinessBySlug(slug) : null;
  if (!business) redirect("/login");
  return business;
}
