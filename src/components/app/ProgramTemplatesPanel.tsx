"use client";

import { useState } from "react";
import { NAMED_PROGRAMS } from "@/lib/fitness/program-templates";

export default function ProgramTemplatesPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function start(slug: string) {
    setPending(slug);
    setMessage(null);
    try {
      const res = await fetch("/api/app/programs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.error ?? "Could not start that plan.");
        return;
      }
      setMessage("Plan loaded. Refresh if you do not see the new days yet.");
      window.location.reload();
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="border border-brand-ink/10 bg-surface-elevated p-4">
      <h2 className="font-display text-xl text-brand-ink">Start from a proven plan</h2>
      <p className="mt-1 font-sans text-sm text-brand-muted">
        Copies a named template into your Engine. AI generation stays available.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {NAMED_PROGRAMS.map((program) => (
          <li key={program.slug} className="border border-brand-ink/10 p-3">
            <p className="font-sans text-sm font-semibold text-brand-ink">
              {program.title}
            </p>
            <p className="font-sans text-xs text-brand-muted">{program.summary}</p>
            <button
              type="button"
              disabled={pending === program.slug}
              onClick={() => void start(program.slug)}
              className="mt-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
            >
              {pending === program.slug ? "Starting…" : "Use this plan"}
            </button>
          </li>
        ))}
      </ul>
      {message ? (
        <p className="mt-3 font-sans text-sm text-brand-muted">{message}</p>
      ) : null}
    </section>
  );
}
