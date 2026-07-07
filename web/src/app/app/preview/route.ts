import { NextResponse, type NextRequest } from "next/server";
import { getBusinessBySlug, pickDemoBusiness } from "@/lib/data";

// Enters preview mode: links an unauthenticated visitor to a sample business
// via cookie so the /app shell can render server-side. Replaced by real
// account linking (accounts.business_id) at Supabase cutover.
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("b");
  const business =
    (requested ? getBusinessBySlug(requested) : null) ?? pickDemoBusiness();

  const res = NextResponse.redirect(new URL("/app", request.url));
  res.cookies.set("conet_preview", business.slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  return res;
}
