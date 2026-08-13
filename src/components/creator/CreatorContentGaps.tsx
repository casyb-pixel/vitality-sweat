"use client";

import { useEffect, useState } from "react";
import type { LibrarySearchSignal } from "@/lib/library/signals";

type CreatorContentGapsProps = {
  onWriteAbout?: (topic: string) => void;
};

export default function CreatorContentGaps({
  onWriteAbout,
}: CreatorContentGapsProps) {
  const [signals, setSignals] = useState<LibrarySearchSignal[]>([]);
  const [gscQueries, setGscQueries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/creator/library-signals");
        const json = (await res.json()) as {
          ok?: boolean;
          signals?: LibrarySearchSignal[];
          gscQueries?: string[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Could not load member search signals.");
          setSignals([]);
          return;
        }
        setSignals(json.signals ?? []);
        setGscQueries(json.gscQueries ?? []);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Could not load member search signals.");
          setSignals([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-4">
        <p className="font-sans text-sm text-brand-muted">
          Checking member Library searches…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-4">
        <p className="font-sans text-sm text-brand-muted">{error}</p>
      </section>
    );
  }

  if (!signals.length) {
    return (
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-4">
        <h2 className="font-display text-xl text-brand-ink">
          Member topic requests
        </h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          No strong Library search signals yet. When members search topics with
          thin coverage, prompts show up here.
        </p>
        {gscQueries.length ? (
          <ul className="mt-3 list-disc pl-5 font-sans text-sm text-brand-ink">
            {gscQueries.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-3 border border-brand-orange/30 bg-brand-orange/5 px-4 py-4 sm:px-5">
      <div>
        <p className="eyebrow text-brand-orange">Content gaps</p>
        <h2 className="mt-1 font-display text-xl text-brand-ink sm:text-2xl">
          Members are searching these topics
        </h2>
        <p className="mt-1 font-sans text-sm leading-relaxed text-brand-muted">
          Zero-result searches are flagged first — write a Chronicle (or film a
          clip) so the Library can answer next time.
        </p>
      </div>

      <ul className="space-y-2">
        {signals.map((signal) => (
          <li
            key={signal.query}
            className="flex flex-col gap-2 border border-brand-ink/10 bg-surface-elevated p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-display text-lg text-brand-ink">
                {signal.sampleRaw}
              </p>
              <p className="mt-0.5 font-sans text-xs text-brand-muted">
                {signal.searchCount} search
                {signal.searchCount === 1 ? "" : "es"}
                {signal.isGap
                  ? ` · ${signal.zeroResultCount} with no matches`
                  : " · emerging interest"}
              </p>
            </div>
            {onWriteAbout ? (
              <button
                type="button"
                onClick={() => onWriteAbout(signal.sampleRaw)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
              >
                Write about this
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {gscQueries.length ? (
        <div className="border border-brand-ink/10 bg-surface-elevated p-3">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
            Search Console starter queries
          </p>
          <p className="mt-1 font-sans text-xs text-brand-muted">
            Pipe live GSC for sc-domain:vitalitysweat.com when that property is
            connected. Until then, write these 17-25 queries first.
          </p>
          <ul className="mt-2 list-disc pl-5 font-sans text-sm text-brand-ink">
            {gscQueries.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
