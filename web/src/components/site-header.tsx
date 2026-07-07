import Link from "next/link";

// Top navigation per DESIGN.md: Paper background, ~64px tall, text wordmark,
// ghost nav links, ONE filled black button at far right. No border-bottom —
// separation is whitespace alone. No icons.
export function SiteHeader() {
  return (
    <header className="bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className="rounded-links text-label font-medium text-obsidian"
        >
          CO_ Network
          <span className="ml-2 font-normal text-graphite">Coral Gables</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/directory"
            className="rounded-full px-3 py-1.5 text-label font-medium text-obsidian transition-colors duration-200 hover:bg-whisper"
          >
            Directory
          </Link>
          <Link
            href="/claim/new"
            className="rounded-full px-3 py-1.5 text-label font-medium text-obsidian transition-colors duration-200 hover:bg-whisper"
          >
            Add a business
          </Link>
          <Link
            href="/directory"
            className="ml-3 rounded-full bg-obsidian px-5 py-2 text-label font-medium text-paper transition-opacity duration-200 hover:opacity-80"
          >
            Claim your business
          </Link>
        </nav>
      </div>
    </header>
  );
}

// Footer per DESIGN.md: Paper, graphite 13-14px, generous top padding,
// utilitarian and quiet. No social icons.
export function SiteFooter() {
  return (
    <footer className="mt-16 bg-paper pb-12 pt-16">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="border-t border-hairline pt-8">
          <p className="max-w-2xl text-caption font-normal text-graphite">
            CO_ Network is operated by CO_, an AI consulting and digital analytics agency.
            Business data is gathered from public sources and verified owners; owners can claim
            their profile to review and correct it at any time.
          </p>
          <div className="mt-6 flex gap-6 text-caption font-medium text-graphite">
            <Link href="/directory" className="rounded-links transition-colors duration-200 hover:text-obsidian">
              Directory
            </Link>
            <Link href="/claim/new" className="rounded-links transition-colors duration-200 hover:text-obsidian">
              Add a business
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
