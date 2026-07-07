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
          <span className="mb-1.5 block text-caption font-w510 text-mist">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full rounded-inputs border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[14px] text-mist outline-none placeholder:text-fog focus:border-mist"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-caption font-w510 text-mist">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            className="w-full rounded-inputs border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[14px] text-mist outline-none placeholder:text-fog focus:border-mist"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 text-caption font-normal text-mist" role="alert">
          {error}
        </p>
      )}

      {offline && (
        <div
          className="mt-5 rounded-cards border border-graphite bg-carbon p-5"
          role="alert"
        >
          <p className="text-caption font-w510 text-paper">Accounts are opening shortly</p>
          <p className="mt-1 text-caption font-normal leading-relaxed text-fog">
            The network database isn’t live yet, so sign-{mode === "signup" ? "up" : "in"} is
            briefly unavailable. You can explore the owner dashboard with sample data in the
            meantime.
          </p>
          <Link
            href="/app/preview"
            className="mt-3 inline-flex cursor-pointer items-center rounded-buttons border border-graphite px-3 py-2 text-caption text-mist transition-colors duration-150 hover:border-smoke hover:bg-white/[0.03]"
          >
            Explore the preview
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-buttons bg-acid-lime px-4 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85 disabled:cursor-default disabled:opacity-40"
      >
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
