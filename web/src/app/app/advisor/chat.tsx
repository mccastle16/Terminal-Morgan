"use client";

// AI Adviser chat — ChatGPT structure × Linear skin. User messages sit right-
// aligned in subtle bubbles; assistant replies are plain text blocks with
// optional structured cards beneath. Threads persist to localStorage
// (conet_chat_<id>; index conet_chats_index) and every index mutation
// dispatches "conet-chats-changed" so the sidebar stays in sync.

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Search } from "lucide-react";
import { Card, ghostBtnCls, inputCls, MonoTag } from "@/components/terminal/ui";
import { respond, type AdvisorCard, type AdvisorDataset } from "./engine";

type Msg = { role: "user" | "assistant"; text: string; card?: AdvisorCard };
type ChatMeta = { id: string; title: string; at: number };

const INDEX_KEY = "conet_chats_index";
const THREAD_PREFIX = "conet_chat_";

const STARTERS = [
  "Summarize the market",
  "Top restaurants on Miracle Mile",
  "Compare two businesses",
  "How many businesses lack websites?",
];

// ── localStorage helpers (client-only; call from effects/handlers) ──────────

function readIndex(): ChatMeta[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ChatMeta[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(list: ChatMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("conet-chats-changed"));
}

function readThread(id: string): Msg[] | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(THREAD_PREFIX + id) ?? "null");
    return Array.isArray(parsed) ? (parsed as Msg[]) : null;
  } catch {
    return null;
  }
}

function writeThread(id: string, messages: Msg[]) {
  localStorage.setItem(THREAD_PREFIX + id, JSON.stringify(messages));
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Structured card renderers (div-bars only — kept deliberately light) ─────

function CardView({ card }: { card: AdvisorCard }) {
  if (card.kind === "stats") {
    return (
      <Card className="mt-3" padded={false}>
        <p className="border-b border-graphite px-4 py-2.5 text-label font-w510 uppercase tracking-wide text-ash">
          {card.title}
        </p>
        <div className="divide-y divide-graphite">
          {card.items.map((it) => (
            <div key={it.label} className="flex items-baseline justify-between gap-4 px-4 py-2">
              <span className="text-caption text-fog">{it.label}</span>
              <span className="text-right text-caption font-w510 text-mist">{it.value}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (card.kind === "table") {
    return (
      <Card className="mt-3 overflow-x-auto" padded={false}>
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="border-b border-graphite">
              {card.columns.map((c, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-label font-w510 uppercase tracking-wide text-ash"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-graphite">
            {card.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2 text-caption ${ci === 0 ? "text-fog" : "text-mist"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }
  if (card.kind === "list") {
    return (
      <Card className="mt-3" padded={false}>
        <p className="border-b border-graphite px-4 py-2.5 text-label font-w510 uppercase tracking-wide text-ash">
          {card.title}
        </p>
        <div className="divide-y divide-graphite">
          {card.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 shrink-0 text-label text-ash">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption font-w510 text-mist">{it.primary}</p>
                <p className="truncate text-label text-fog">{it.secondary}</p>
              </div>
              <span className="shrink-0 text-caption font-w510 text-paper">{it.value}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  // bar
  const max = Math.max(1, ...card.data.map((d) => d.value));
  return (
    <Card className="mt-3">
      <p className="text-label font-w510 uppercase tracking-wide text-ash">{card.title}</p>
      <div className="mt-3 space-y-2">
        {card.data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-label text-fog">{d.label}</span>
            <span className="h-1.5 flex-1 rounded-pills bg-white/[0.06]">
              <span
                className="block h-1.5 rounded-pills bg-mist"
                style={{ width: `${Math.max(1, (d.value / max) * 100)}%` }}
                aria-hidden
              />
            </span>
            <span className="w-12 shrink-0 text-right">
              <MonoTag>{d.value.toLocaleString("en-US")}</MonoTag>
            </span>
          </div>
        ))}
      </div>
      {card.note && <p className="mt-3 text-label text-ash">{card.note}</p>}
    </Card>
  );
}

// ── Chat search panel (filters saved chats by title/content) ────────────────

function SearchPanel({
  onOpen,
  onClose,
}: {
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    setChats(readIndex());
  }, []);

  const q = query.trim().toLowerCase();
  const results = chats.filter((c) => {
    if (!q) return true;
    if (c.title.toLowerCase().includes(q)) return true;
    const thread = readThread(c.id);
    return thread?.some((m) => m.text.toLowerCase().includes(q)) ?? false;
  });

  function remove(id: string) {
    localStorage.removeItem(THREAD_PREFIX + id);
    const next = readIndex().filter((c) => c.id !== id);
    writeIndex(next);
    setChats(next);
  }

  function saveRename(id: string) {
    const title = renameValue.trim();
    if (title) {
      const next = readIndex().map((c) => (c.id === id ? { ...c, title } : c));
      writeIndex(next);
      setChats(next);
    }
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats by title or content"
            className={inputCls() + " pl-9"}
          />
        </div>
        <button onClick={onClose} className={ghostBtnCls()}>
          Close
        </button>
      </div>
      <div className="mt-3 divide-y divide-graphite">
        {results.length === 0 && (
          <p className="py-6 text-center text-caption text-fog">
            {chats.length === 0 ? "No saved chats yet." : "No chats match."}
          </p>
        )}
        {results.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-2.5">
            {renamingId === c.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename(c.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => saveRename(c.id)}
                className={inputCls() + " flex-1 py-1.5"}
              />
            ) : (
              <button
                onClick={() => onOpen(c.id)}
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-caption text-mist transition-colors duration-150 hover:text-paper"
              >
                {c.title}
              </button>
            )}
            <span className="shrink-0 text-label text-ash">
              {new Date(c.at).toLocaleDateString()}
            </span>
            <button
              onClick={() => {
                setRenamingId(c.id);
                setRenameValue(c.title);
              }}
              className="shrink-0 cursor-pointer text-label text-fog transition-colors duration-150 hover:text-mist"
            >
              Rename
            </button>
            <button
              onClick={() => remove(c.id)}
              className="shrink-0 cursor-pointer text-label text-fog transition-colors duration-150 hover:text-coral-red"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Chat inner (uses useSearchParams — must sit inside <Suspense>) ──────────

function ChatInner({ dataset }: { dataset: AdvisorDataset }) {
  const params = useSearchParams();
  const router = useRouter();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chat = params.get("chat");
    setSearchOpen(params.get("search") === "1");
    if (params.get("new") === "1") {
      setChatId(null);
      setMessages([]);
      return;
    }
    if (chat) {
      const thread = readThread(chat);
      if (thread) {
        setChatId(chat);
        setMessages(thread);
        return;
      }
    }
    if (!chat) {
      setChatId(null);
      setMessages([]);
    }
  }, [params]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function send(raw: string) {
    const text = raw.trim();
    if (!text) return;
    const reply = respond(text, dataset);
    const next: Msg[] = [
      ...messages,
      { role: "user", text },
      { role: "assistant", text: reply.text, card: reply.card },
    ];
    setMessages(next);
    setInput("");

    let id = chatId;
    if (!id) {
      id = newId();
      setChatId(id);
      writeThread(id, next);
      writeIndex([{ id, title: text.slice(0, 40), at: Date.now() }, ...readIndex()]);
      router.replace(`/app/advisor?chat=${id}`);
    } else {
      writeThread(id, next);
      const idx = readIndex();
      const current = idx.find((c) => c.id === id);
      if (current) {
        writeIndex([{ ...current, at: Date.now() }, ...idx.filter((c) => c.id !== id)]);
      }
    }
  }

  // ChatGPT-style pill composer: everything lives inside one rounded
  // container, send is a circular arrow button on the right. Auto-grows.
  const composer = (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-2 rounded-[26px] border border-white/[0.08] bg-white/[0.03] py-2 pl-5 pr-2 transition-colors duration-150 focus-within:border-white/20">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
              (e.target as HTMLTextAreaElement).style.height = "auto";
            }
          }}
          placeholder="Ask anything about the Coral Gables market"
          aria-label="Message the adviser"
          className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-mist outline-none placeholder:text-fog"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper text-void transition-opacity duration-150 hover:opacity-85 disabled:cursor-default disabled:bg-white/[0.08] disabled:text-fog"
        >
          <ArrowUp size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-center text-label text-ash">
        Local rule-based adviser — answers computed from the live snapshot, saved in this browser.
      </p>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[420px] flex-col">
      {searchOpen ? (
        <div className="flex-1 overflow-y-auto py-2">
          <SearchPanel
            onOpen={(id) => router.push(`/app/advisor?chat=${id}`)}
            onClose={() => router.push(chatId ? `/app/advisor?chat=${chatId}` : "/app/advisor")}
          />
        </div>
      ) : messages.length === 0 ? (
        // Empty state — ChatGPT pattern: heading + composer centered mid-screen
        <div className="flex flex-1 flex-col items-center justify-center pb-16">
          <h1 className="text-heading-sm font-w510 text-paper">Where should we begin?</h1>
          <div className="mt-7 w-full">{composer}</div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="inline-flex cursor-pointer items-center rounded-pills border border-graphite px-3.5 py-1.5 text-caption text-fog transition-colors duration-150 hover:border-smoke hover:text-mist"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
            <div className="mx-auto w-full max-w-3xl">
              <div className="space-y-6 py-4">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[75%] rounded-[20px] bg-white/[0.06] px-4 py-2.5 text-body-sm text-mist">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={i}>
                      <p className="whitespace-pre-wrap text-body-sm text-mist">{m.text}</p>
                      {m.card && <CardView card={m.card} />}
                    </div>
                  )
                )}
                <div ref={endRef} />
              </div>
            </div>
          </div>
          <div className="pt-3">{composer}</div>
        </>
      )}
    </div>
  );
}

export function AdvisorChat({ dataset }: { dataset: AdvisorDataset }) {
  return (
    <Suspense fallback={null}>
      <ChatInner dataset={dataset} />
    </Suspense>
  );
}
