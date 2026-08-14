"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TERMS_ACCEPT_LABEL } from "@/lib/legal/terms-2026-08-14";

export default function TermsAcceptForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!accepted) {
      setError("Check the box to agree before continuing.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accept_terms: true }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Could not save your agreement.");
          return;
        }
        router.replace("/app");
        router.refresh();
      } catch {
        setError("Could not save your agreement.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-10 space-y-4 border border-brand-ink/10 bg-surface-elevated p-5"
    >
      <label className="flex cursor-pointer items-start gap-3 font-sans text-sm leading-relaxed text-brand-ink">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-orange"
        />
        <span>{TERMS_ACCEPT_LABEL}</span>
      </label>
      {error ? (
        <p className="font-sans text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center bg-brand-ink px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : "Agree and continue"}
      </button>
    </form>
  );
}
