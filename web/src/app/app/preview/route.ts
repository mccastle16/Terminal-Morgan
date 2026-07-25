import { NextResponse, type NextRequest } from "next/server";
import { getBusinessBySlug, pickDemoBusiness } from "@/lib/data";
import { isRole } from "@/lib/terminal/roles";

// Enters preview mode with a chosen role (?role=leadership|membership|member|
// nonmember|admin) and optional business (?b=slug). Sets the cookies the
// terminal shell reads. Replaced by real account linking at Supabase cutover.
export async function GET(request: NextRequest) {
  const requestedRole = request.nextUrl.searchParams.get("role");
  const role = isRole(requestedRole) ? requestedRole : "member";

  const requestedBusiness = request.nextUrl.searchParams.get("b");
  const business =
    (requestedBusiness ? getBusinessBySlug(requestedBusiness) : null) ??
    pickDemoBusiness();

  const res = NextResponse.redirect(new URL("/app", request.url));
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" as const };
  res.cookies.set("conet_preview", business.slug, opts);
  res.cookies.set("conet_role", role, opts);
  return res;
}
