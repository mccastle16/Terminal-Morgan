import Link from "next/link";

// Top navigation per LinearDesign.md: transparent over the Void canvas,
// ~64px tall, wordmark left, ghost typographic nav links right, and ONE
// white pill (the second-highest-contrast element after the acid-lime CTA).
export function SiteHeader() {
  return (
    <header className="bg-void">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="text-body font-w510 text-paper">
          CO_ Network
          <span className="ml-2 text-caption font-normal text-fog">Coral Gables</span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {/* Content nav — linear.app pattern: quiet typographic links */}
          {[
            { href: "/directory", label: "Directory" },
            { href: "/#how-it-works", label: "How it works", hide: "md" },
            { href: "/#features", label: "For owners", hide: "md" },
            { href: "/claim/new", label: "Add a business", hide: "sm" },
            { href: "/app/preview?role=member", label: "Preview", hide: "sm" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-buttons px-3 py-2 text-caption font-normal text-mist transition-colors duration-150 hover:bg-white/[0.03] hover:text-paper ${
                item.hide === "md"
                  ? "hidden md:block"
                  : item.hide === "sm"
                    ? "hidden sm:block"
                    : ""
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Divider — clear separation between content nav and auth */}
          <span aria-hidden className="mx-3 h-4 w-px bg-smoke" />

          <Link
            href="/login"
            className="rounded-buttons px-3 py-2 text-caption font-normal text-mist transition-colors duration-150 hover:bg-white/[0.03] hover:text-paper"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="ml-2 rounded-pills bg-paper px-4 py-2 text-caption font-w510 text-void transition-opacity duration-150 hover:opacity-85"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

// Footer: quiet, hairline-separated, grey typographic links only.
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-void pb-12">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="border-t border-graphite pt-8">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between">
            <p className="max-w-md text-caption font-normal text-fog">
              CO_ Network is operated by CO_, an AI consulting and digital analytics agency.
              Business data is gathered from public sources and verified owners; owners can
              claim their profile to review and correct it at any time.
            </p>
            <div className="flex gap-8">
              <div className="flex flex-col gap-2">
                <p className="text-label font-w510 uppercase tracking-wide text-ash">Network</p>
                <Link
                  href="/directory"
                  className="text-caption text-fog transition-colors duration-150 hover:text-mist"
                >
                  Directory
                </Link>
                <Link
                  href="/claim/new"
                  className="text-caption text-fog transition-colors duration-150 hover:text-mist"
                >
                  Add a business
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-label font-w510 uppercase tracking-wide text-ash">Owners</p>
                <Link
                  href="/signup"
                  className="text-caption text-fog transition-colors duration-150 hover:text-mist"
                >
                  Claim your business
                </Link>
                <Link
                  href="/login"
                  className="text-caption text-fog transition-colors duration-150 hover:text-mist"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
