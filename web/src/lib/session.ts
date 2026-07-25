import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBusinessBySlug, type Business } from "@/lib/data";
import { isRole, type Role } from "@/lib/terminal/roles";

export type Session = {
  role: Role;
  /** The linked business — meaningful for member/nonmember; for staff roles
   *  it's the sample business used by My Business style views. */
  business: Business;
};

// Resolves the terminal session. Today: preview cookies (conet_role +
// conet_preview). At Supabase cutover: auth session -> accounts.role +
// accounts.business_id, with preview kept as the logged-out demo path.
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const slug = cookieStore.get("conet_preview")?.value;
  const roleRaw = cookieStore.get("conet_role")?.value;
  const business = slug ? getBusinessBySlug(slug) : null;
  if (!business || !isRole(roleRaw)) redirect("/login");
  return { role: roleRaw, business };
}

/** Back-compat helper used by earlier pages. */
export async function getSessionBusiness(): Promise<Business> {
  return (await getSession()).business;
}
