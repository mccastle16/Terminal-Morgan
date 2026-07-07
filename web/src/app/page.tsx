// Placeholder landing — the public SSR directory (Week 2) replaces this.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          CO_ Network
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Every business in Coral Gables, mapped.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-400">
          A relationship network for the Coral Gables business ecosystem —
          claim your business, correct your data, see how you stand, and find
          the connections that matter. Launching soon.
        </p>
        <p className="mt-8 text-xs text-slate-600">
          Operated by CO_ · 2,730 businesses indexed
        </p>
      </div>
    </main>
  );
}
