import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // no live Supabase project yet — preview cookies are the only session
  }
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.delete("conet_preview");
  res.cookies.delete("conet_role");
  return res;
}
