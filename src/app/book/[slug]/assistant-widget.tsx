"use client";

import { useEffect, useRef, useState } from "react";

type Block = { type: string; text?: string };
type Msg = { role: "user" | "assistant"; content: string | Block[] };
type Bubble = { role: "user" | "assistant"; text: string };

function renderable(messages: Msg[]): Bubble[] {
  const out: Bubble[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      if (typeof m.content === "string" && m.content.trim()) out.push({ role: "user", text: m.content });
    } else {
      const text = Array.isArray(m.content)
        ? m.content.filter((b) => b.type === "text" && b.text).map((b) => b.text).join("")
        : String(m.content);
      if (text.trim()) out.push({ role: "assistant", text });
    }
  }
  return out;
}

export default function AssistantWidget({ slug, orgName }: { slug: string; orgName: string }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const greeting = `Hi! I'm the booking assistant for ${orgName}. Tell me what you'd like and when — for example, "a women's haircut this Friday afternoon".`;
  const bubbles = renderable(history);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [history, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...history, { role: "user", content: text }];
    setHistory(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/book-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, messages: next }),
      });
      const data = await res.json();
      if (data?.messages) setHistory(data.messages);
      else throw new Error(data?.error || "Request failed");
    } catch {
      setHistory([...next, { role: "assistant", content: "Sorry — I couldn't reach the booking assistant. Please try again or use the form above." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close booking assistant" : "Open booking assistant"}
        className="fixed z-40 bottom-5 right-5 w-14 h-14 rounded-full shadow-lg grid place-items-center text-white text-2xl bg-gradient-to-br from-[#4b3560] to-[#5b3b6e] hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? "×" : "✦"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-40 bottom-24 right-5 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-black/10 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,70vh)]">
          <div className="bg-gradient-to-br from-[#2c2138] via-[#4b3560] to-[#5b3b6e] text-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <div>
                <div className="font-semibold text-sm leading-tight">Booking assistant</div>
                <div className="text-[11px] text-purple-200 leading-tight">{orgName}</div>
              </div>
            </div>
          </div>

          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#faf7f2]">
            <Bubble role="assistant" text={greeting} />
            {bubbles.map((b, i) => (
              <Bubble key={i} role={b.role} text={b.text} />
            ))}
            {loading && (
              <div className="flex gap-1 px-3 py-2 w-max rounded-2xl bg-white border border-black/5 text-[#5b3b6e]">
                <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
              </div>
            )}
          </div>

          <div className="border-t border-black/10 p-2 bg-white">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type your message…"
                className="flex-1 resize-none rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#5b3b6e]"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-[#4b3560] to-[#5b3b6e] disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-snug ${
          mine ? "bg-gradient-to-br from-[#4b3560] to-[#5b3b6e] text-white" : "bg-white border border-black/5 text-[#2c2138]"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: delay }} />;
}
