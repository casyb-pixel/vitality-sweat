"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLocalScholarship, setScholarshipApplied } from "@/lib/scholarships/actions";
import type { DeskScholarship, ScholarshipDesk } from "@/lib/scholarships/load";
import type { MatchLevel } from "@/lib/scholarships/types";

const MATCH_LABEL: Record<MatchLevel, string> = {
  likely: "Likely",
  stretch: "Stretch",
  unlikely: "Unlikely",
  needs_info: "Needs an answer",
};

function deadlineLabel(item: DeskScholarship): string {
  if (!item.deadline) return "No date yet";
  if (item.daysUntil == null) return item.deadline;
  if (item.daysUntil < 0) return `${item.deadline} (past due)`;
  if (item.daysUntil === 0) return `${item.deadline} (today)`;
  return `${item.deadline} (${item.daysUntil} days)`;
}

export default function ScholarshipTracker({
  data,
  onEdit,
}: {
  data: ScholarshipDesk;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(data.scholarships);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const warnings = rows
    .filter((item) => !item.applied && item.daysUntil != null && item.daysUntil <= 14)
    .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));

  async function toggle(item: DeskScholarship) {
    const next = !item.applied;
    setPendingId(item.id);
    setError(null);
    setRows((current) =>
      current.map((row) => (row.id === item.id ? { ...row, applied: next, status: next ? "applied" : "not_started" } : row)),
    );
    const result = await setScholarshipApplied(item.id, next);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      setRows((current) =>
        current.map((row) => (row.id === item.id ? { ...row, applied: item.applied, status: item.status } : row)),
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand-orange">Private</p>
          <h1 className="font-display text-4xl text-brand-ink">Scholarship list</h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-brand-muted">
            Tuition is the TOPS job. These rows are the extra money for room,
            board, and meals, plus the filings that keep TOPS itself.
          </p>
          {data.confirmed ? null : (
            <p className="mt-2 max-w-2xl font-sans text-sm text-brand-ink">
              The answers are saved. Use Edit answers if a field is wrong, then save from the last step.
            </p>
          )}
        </div>
        <button type="button" onClick={onEdit} className="border border-brand-ink/20 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em]">
          Edit answers
        </button>
      </header>

      {warnings.length ? (
        <section className="border border-brand-orange bg-brand-orange/10 p-5">
          <h2 className="font-display text-2xl text-brand-ink">Coming up, not applied</h2>
          <ul className="mt-3 space-y-2">
            {warnings.map((item) => (
              <li key={item.id} className="font-sans text-sm text-brand-ink">
                {item.name}: {deadlineLabel(item)}
                {item.url ? (
                  <>
                    {" "}
                    <a className="font-semibold text-brand-orange" href={item.url} target="_blank" rel="noreferrer">
                      Open application
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="font-sans text-sm text-brand-muted">
          Nothing unfiled inside the next 14 days.
        </p>
      )}

      {error ? <p className="font-sans text-sm text-red-700">{error}</p> : null}

      <ul className="space-y-4">
        {rows.map((item) => (
          <li key={item.id} className="border border-brand-ink/10 bg-surface-elevated p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                  {MATCH_LABEL[item.match]}
                </p>
                <h2 className="mt-1 font-display text-2xl text-brand-ink">{item.name}</h2>
                <p className="font-sans text-sm text-brand-muted">{item.sponsor}</p>
              </div>
              <label className="flex items-center gap-2 font-sans text-sm font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={item.applied}
                  disabled={pendingId === item.id}
                  onChange={() => void toggle(item)}
                />
                Applied
              </label>
            </div>
            {item.amount ? <p className="mt-3 font-sans text-sm text-brand-ink">{item.amount}</p> : null}
            <p className="mt-2 font-sans text-sm text-brand-muted">{item.reason}</p>
            <p className="mt-2 font-sans text-sm text-brand-ink">{deadlineLabel(item)}</p>
            {item.deadlineNote ? <p className="mt-1 font-sans text-sm text-brand-muted">{item.deadlineNote}</p> : null}
            {item.notes ? <p className="mt-2 font-sans text-sm text-brand-muted">{item.notes}</p> : null}
            {item.url ? (
              <a className="mt-3 inline-block font-sans text-sm font-semibold text-brand-orange" href={item.url} target="_blank" rel="noreferrer">
                Application site
              </a>
            ) : null}
          </li>
        ))}
      </ul>

      <LocalAwardForm onAdded={() => router.refresh()} />
    </div>
  );
}

function LocalAwardForm({ onAdded }: { onAdded: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="max-w-xl space-y-3 border border-brand-ink/10 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await addLocalScholarship(new FormData(event.currentTarget));
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        event.currentTarget.reset();
        onAdded();
      }}
    >
      <h2 className="font-display text-2xl text-brand-ink">Add a local award</h2>
      <p className="font-sans text-sm text-brand-muted">
        Use this for anything the counseling office hands you.
      </p>
      <input name="name" required placeholder="Scholarship name" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <input name="sponsor" required placeholder="Sponsor" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <input name="url" placeholder="https:// application link" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <input name="amount" placeholder="Amount" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <input name="deadline" type="date" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <textarea name="notes" placeholder="Notes" className="min-h-20 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      {error ? <p className="font-sans text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={pending} className="bg-brand-ink px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60">
        {pending ? "Adding" : "Add to the list"}
      </button>
    </form>
  );
}
