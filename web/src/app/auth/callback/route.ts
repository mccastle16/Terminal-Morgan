import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Auth code exchange for magic links / OAuth. An accounts row is created
// automatically by the on_auth_user_created trigger (0001_core_schema.sql)
// with role='owner', link_status='unlinked' — onboarding (Week 2) takes over
// from there.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
