import Link from "next/link";
import { Network } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-slate-100 transition-colors hover:text-amber-400">
          <Network size={18} className="text-amber-500" aria-hidden />
          <span className="text-sm font-bold tracking-[0.18em]">CO_ NETWORK</span>
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">Coral Gables</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/directory"
            className="rounded-lg px-3 py-1.5 text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-100"
          >
            Directory
          </Link>
          <Link
            href="/directory"
            className="ml-2 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Claim your business
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/80 py-8">
      <div className="mx-auto max-w-6xl px-4 text-xs leading-relaxed text-slate-500 sm:px-6">
        <p>
          CO_ Network is operated by <span className="font-semibold text-slate-400">CO_</span>, an AI
          consulting and digital analytics agency. Business data is gathered from public sources and
          verified owners; owners can claim their profile to review and correct it at any time.
        </p>
      </div>
    </footer>
  );
}
