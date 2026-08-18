"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COACH_STARTERS,
  type CoachMessage,
} from "@/lib/engine-room/coach";

const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

export default function EngineRoomCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/engine-room/coach");
    const json = (await res.json()) as {
      ok?: boolean;
      messages?: CoachMessage[];
      remaining?: number;
      error?: string;
    };
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Could not load the Engine coach.");
      return;
    }
    setMessages(json.messages ?? []);
    setRemaining(json.remaining ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || pending) return;
    setPending(true);
    setError(null);
    setStatus("Looking at your last session…");
    setDraft("");
    try {
      const res = await fetch("/api/app/engine-room/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        messages?: CoachMessage[];
        remaining?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not reach the Engine coach.");
        setDraft(body);
        return;
      }
      setMessages(json.messages ?? []);
      setRemaining(json.remaining ?? null);
    } catch {
      setError("Could not reach the Engine coach.");
      setDraft(body);
    } finally {
      setPending(false);
      setStatus(null);
    }
  }

  return (
    <section className="border border-brand-ink/10 bg-surface-elevated p-5">
      <h2 className="font-display text-xl text-brand-ink">Engine coach</h2>
      <p className="mt-1 font-sans text-sm text-brand-muted">
        One thread. Same coach. Ranks, streak, and quests sit in the context.
        This is not a DM with other members.
      </p>
      {remaining != null ? (
        <p className="mt-1 font-sans text-xs text-brand-muted">
          {remaining} messages left today
        </p>
      ) : null}

      <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
        {messages.length === 0 && !pending ? (
          <div className="space-y-2">
            <p className="font-sans text-sm text-brand-muted">
              Ask something, or start here:
            </p>
            <div className="flex flex-wrap gap-2">
              {COACH_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className={secondaryBtn}
                  disabled={pending}
                  onClick={() => void send(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-8 border border-brand-ink/10 bg-white p-3"
                  : "mr-8 border border-brand-orange/30 bg-brand-orange/5 p-3"
              }
            >
              <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                {message.role === "user" ? "You" : "Engine"}
              </p>
              <p className="mt-1 whitespace-pre-wrap font-sans text-sm text-brand-ink">
                {message.body}
              </p>
            </div>
          ))
        )}
        {status ? (
          <p className="font-sans text-sm text-brand-muted">{status}</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="mt-3 font-sans text-sm text-red-700">{error}</p>
      ) : null}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the Engine"
          disabled={pending}
          className="min-h-10 flex-1 border border-brand-ink/15 px-3 py-2 font-sans text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          className={primaryBtn}
          disabled={pending || !draft.trim()}
        >
          {pending ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
