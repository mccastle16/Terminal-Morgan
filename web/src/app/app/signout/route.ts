import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // no live Supabase project yet — preview cookie is the only session
  }
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.delete("conet_preview");
  return res;
}
