"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CircleAlert, Leaf, Send, Sparkles, X } from "lucide-react";
import { AI_SUGGESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EcoBot({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm EcoBot AI, your environmental assistant for ${siteName}. I can help you choose a problem category, explain how reporting works, share conservation tips, or check the status of your own complaint after you sign in.\n\nWhat would you like help with?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const key = "eco_chat_session";
    const existing = window.localStorage.getItem(key);
    if (existing) setSessionId(existing);
    else {
      const created = createSessionId();
      window.localStorage.setItem(key, created);
      setSessionId(created);
    }
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          chatSessionId: sessionId || "pending-session",
          language: /[\u0900-\u097F]/.test(trimmed) ? "hi" : "en",
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "EcoBot is unavailable right now.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "I could not generate a response. Please try again." },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the assistant service. You can still report the problem through the Report a Problem page or contact campus staff directly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "no-print fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-2xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-forest-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Open EcoBot AI environmental assistant"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/60" />
          <Bot className="relative h-5 w-5" />
        </span>
        <span className="hidden sm:inline">EcoBot AI</span>
      </button>

      <div
        className={cn(
          "no-print fixed inset-0 z-[90] flex items-end justify-end bg-ink-950/20 backdrop-blur-[2px] transition-opacity sm:bg-transparent sm:backdrop-blur-0",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="EcoBot AI chat assistant"
          className={cn(
            "flex h-[88dvh] w-full flex-col overflow-hidden border-t border-emerald-500/15 bg-white shadow-2xl transition-transform duration-300 sm:bottom-5 sm:right-5 sm:h-[min(680px,86dvh)] sm:w-[410px] sm:rounded-3xl sm:border dark:bg-[#0d1a14]",
            open ? "translate-y-0" : "translate-y-8",
          )}
        >
          <header className="flex items-center gap-3 border-b bg-gradient-to-r from-forest-900 to-forest-700 px-4 py-3.5 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold">EcoBot AI</h2>
              <p className="flex items-center gap-1 text-[11px] text-emerald-100/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Environmental assistant · EN / हिंदी / Hinglish
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 transition hover:bg-white/10"
              aria-label="Close EcoBot"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn("flex gap-2.5", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" ? (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Leaf className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    message.role === "user"
                      ? "rounded-br-md bg-forest-800 text-white dark:bg-emerald-600"
                      : "rounded-bl-md bg-ink-50 text-ink-700 ring-1 ring-ink-100 dark:bg-white/5 dark:text-ink-100 dark:ring-white/10",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
                  <Leaf className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center gap-1 rounded-2xl bg-ink-50 px-4 py-3 dark:bg-white/5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {error ? (
              <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {messages.length < 3 ? (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {AI_SUGGESTIONS.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-medium text-emerald-800 transition hover:bg-emerald-500/10 dark:text-emerald-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="border-t bg-white p-3 dark:bg-[#0d1a14]"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border bg-ink-50/60 p-1.5 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10 dark:bg-white/5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={1200}
                placeholder="Ask about a problem, category or tip…"
                className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[13px] outline-none placeholder:text-ink-400"
                aria-label="Message EcoBot AI"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-white transition hover:bg-forest-700 disabled:opacity-40 dark:bg-emerald-600"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-[9px] text-ink-400">
              <Sparkles className="h-2.5 w-2.5" /> EcoBot can make mistakes. For hazards, stay away and contact authorized staff.
            </p>
          </form>
        </section>
      </div>
    </>
  );
}
