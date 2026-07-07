import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. RLS (supabase/migrations/0002_rls.sql) is the
// trust boundary — the anon key is safe to expose; it grants nothing RLS doesn't.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
