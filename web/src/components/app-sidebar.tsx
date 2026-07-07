"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Owner-dashboard navigation — the successor to the old Terminal's 24-tab
// chamber cockpit, re-scoped to what a business owner is allowed to see
// (REBUILD-PLAN D5). Ghost links, Whisper active state, hairline structure.

const GROUPS: {
  label: string;
  items: { href: string; label: string; soon?: boolean }[];
}[] = [
  {
    label: "Your business",
    items: [
      { href: "/app", label: "Overview" },
      { href: "/app/business", label: "Profile & data" },
      { href: "/app/benchmark", label: "Benchmark" },
      { href: "/app/connections", label: "Connections" },
    ],
  },
  {
    label: "Network",
    items: [{ href: "/directory", label: "Directory" }],
  },
  {
    label: "Coming soon",
    items: [
      { href: "#", label: "Digital presence report", soon: true },
      { href: "#", label: "Corrections queue", soon: true },
      { href: "#", label: "Verified badge", soon: true },
    ],
  },
];

export function AppSidebar({ publicSlug }: { publicSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-8" aria-label="Dashboard">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-caption font-medium text-graphite">{group.label}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) =>
              item.soon ? (
                <li key={item.label}>
                  <span className="block cursor-default rounded-full px-3 py-1.5 text-label font-normal text-smoke">
                    {item.label}
                  </span>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`block rounded-full px-3 py-1.5 text-label font-medium text-obsidian transition-colors duration-200 hover:bg-whisper ${
                      pathname === item.href ? "bg-whisper" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            )}
            {group.label === "Network" && (
              <li>
                <Link
                  href={`/b/${publicSlug}`}
                  className="block rounded-full px-3 py-1.5 text-label font-medium text-obsidian transition-colors duration-200 hover:bg-whisper"
                >
                  Your public page
                </Link>
              </li>
            )}
          </ul>
        </div>
      ))}
      <div className="mt-auto border-t border-hairline pt-4">
        <a
          href="/app/signout"
          className="block rounded-full px-3 py-1.5 text-label font-medium text-graphite transition-colors duration-200 hover:bg-whisper hover:text-obsidian"
        >
          Sign out
        </a>
      </div>
    </nav>
  );
}
