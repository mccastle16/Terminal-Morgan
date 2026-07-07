"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Shared email/password form for /login and /signup. Wired to Supabase Auth;
// while the network database isn't provisioned yet the calls fail at the
// network layer, which we surface as an honest "opening shortly" state with
// the preview as the escape hatch — never a fake success.

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOffline(false);
    try {
      const supabase = createClient();
      const { error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/app");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/fetch|network|placeholder|failed/i.test(msg)) {
        setOffline(true);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-label font-medium text-obsidian">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full rounded-full border border-hairline bg-transparent px-6 py-2.5 text-input font-normal text-obsidian outline-none placeholder:text-smoke"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-label font-medium text-obsidian">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            className="w-full rounded-full border border-hairline bg-transparent px-6 py-2.5 text-input font-normal text-obsidian outline-none placeholder:text-smoke"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 text-label font-normal text-obsidian" role="alert">
          {error}
        </p>
      )}

      {offline && (
        <div className="mt-5 rounded-cards border border-hairline p-5" role="alert">
          <p className="text-label font-medium text-obsidian">Accounts are opening shortly</p>
          <p className="mt-1 text-caption font-normal leading-relaxed text-graphite">
            The network database isn’t live yet, so sign-{mode === "signup" ? "up" : "in"} is
            briefly unavailable. You can explore the owner dashboard with sample data in the
            meantime.
          </p>
          <Link
            href="/app/preview"
            className="mt-3 inline-block rounded-full border border-hairline px-5 py-2 text-label font-medium text-obsidian transition-shadow duration-200 hover:shadow-sm"
          >
            Explore the preview
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full cursor-pointer rounded-full bg-obsidian px-6 py-2.5 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80 disabled:cursor-default disabled:opacity-40"
      >
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
