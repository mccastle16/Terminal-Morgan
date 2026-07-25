"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import type { NavGroup } from "@/lib/terminal/roles";

// Terminal sidebar — ChatGPT structure (chats first, collapsible rail) in the
// LinearDesign.md vocabulary: Carbon surface, hairline separators, 6px hover
// rows, grey typographic nav, no filled chrome. Icons only in the utility
// area (new chat / search / collapse), per the icon-minimal rule.

type ChatMeta = { id: string; title: string; at: number };

function readChats(): ChatMeta[] {
  try {
    return JSON.parse(localStorage.getItem("conet_chats_index") ?? "[]");
  } catch {
    return [];
  }
}

export function TerminalSidebar({
  nav,
  roleLabel,
  businessName,
}: {
  nav: NavGroup[];
  roleLabel: string;
  businessName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [chats, setChats] = useState<ChatMeta[]>([]);

  useEffect(() => {
    setCollapsed(localStorage.getItem("conet_sidebar_collapsed") === "1");
    setChats(readChats());
    const sync = () => setChats(readChats());
    window.addEventListener("conet-chats-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("conet-chats-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("conet_sidebar_collapsed", next ? "1" : "0");
  }

  const rowCls = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-buttons px-2.5 py-1.5 text-caption transition-colors duration-150 ${
      active ? "bg-white/[0.06] text-paper" : "text-mist hover:bg-white/[0.04]"
    }`;

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-graphite bg-carbon transition-[width] duration-200 ${
        collapsed ? "w-[52px]" : "w-60"
      }`}
    >
      {/* Utility row */}
      <div className={`flex items-center gap-1 px-2 pt-3 ${collapsed ? "flex-col" : ""}`}>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="cursor-pointer rounded-buttons p-2 text-fog transition-colors duration-150 hover:bg-white/[0.04] hover:text-mist"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button
          onClick={() => router.push("/app/advisor?new=1")}
          aria-label="New chat"
          title="New chat"
          className={
            collapsed
              ? "cursor-pointer rounded-buttons p-2 text-fog transition-colors duration-150 hover:bg-white/[0.04] hover:text-mist"
              : rowCls(false) + " flex-1"
          }
        >
          <MessageSquarePlus size={16} className="shrink-0" />
          {!collapsed && <span>New chat</span>}
        </button>
        <button
          onClick={() => router.push("/app/advisor?search=1")}
          aria-label="Search chats"
          title="Search chats"
          className={
            collapsed
              ? "cursor-pointer rounded-buttons p-2 text-fog transition-colors duration-150 hover:bg-white/[0.04] hover:text-mist"
              : "cursor-pointer rounded-buttons p-2 text-fog transition-colors duration-150 hover:bg-white/[0.04] hover:text-mist"
          }
        >
          <Search size={16} />
        </button>
      </div>

      {/* Scrollable nav */}
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
        {!collapsed && chats.length > 0 && (
          <div className="mb-4">
            <p className="px-2.5 pb-1 text-label font-w510 uppercase tracking-wide text-ash">
              Chats
            </p>
            {chats.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/app/advisor?chat=${c.id}`} className={rowCls(false)}>
                <span className="truncate">{c.title}</span>
              </Link>
            ))}
          </div>
        )}

        {nav.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-2.5 pb-1 text-label font-w510 uppercase tracking-wide text-ash">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={rowCls(active)}
                >
                  {collapsed ? (
                    <span className="mx-auto text-label font-w510">
                      {item.label.slice(0, 2)}
                    </span>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Session footer */}
      <div className="border-t border-graphite px-2 py-3">
        {!collapsed && (
          <div className="px-2.5 pb-2">
            <p className="truncate text-caption text-mist">{businessName}</p>
            <p className="text-label text-ash">{roleLabel}</p>
          </div>
        )}
        <a
          href="/app/signout"
          className="flex items-center rounded-buttons px-2.5 py-1.5 text-caption text-fog transition-colors duration-150 hover:bg-white/[0.04] hover:text-mist"
          title="Sign out"
        >
          {collapsed ? "×" : "Sign out"}
        </a>
      </div>
    </aside>
  );
}
