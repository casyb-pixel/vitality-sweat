"use client";

import { useState } from "react";
import type { NestedProgramDay } from "@/components/app/WorkoutAgent";

type TrainTogetherSheetProps = {
  day: NestedProgramDay;
  sessionId?: string | null;
};

const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";
const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-brand-orange-deep disabled:opacity-60";

export default function TrainTogetherSheet({
  day,
  sessionId,
}: TrainTogetherSheetProps) {
  const [open, setOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function openSheet() {
    setOpen(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/workout/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_day_id: day.id,
          session_id: sessionId ?? null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        joinUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.joinUrl) {
        setError(json.error ?? "Could not create invite.");
        return;
      }
      setJoinUrl(json.joinUrl);
      const QR = await import("qrcode");
      const dataUrl = await QR.toDataURL(json.joinUrl, {
        width: 360,
        margin: 1,
        color: { dark: "#404040", light: "#ffffff" },
      });
      setQr(dataUrl);
    } catch {
      setError("Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  return (
    <>
      <button type="button" className={secondaryBtn} onClick={() => void openSheet()}>
        Train together
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="train-together-title"
        >
          <div className="w-full max-w-md border border-brand-ink/10 bg-surface-elevated p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-brand-orange">Gym floor</p>
                <h3
                  id="train-together-title"
                  className="font-display text-2xl text-brand-ink"
                >
                  Train together
                </h3>
              </div>
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-2 font-sans text-sm text-brand-muted">
              A teammate scans this QR to jump on {day.label} for this session
              only. Their program stays theirs.
            </p>
            {busy ? (
              <p className="mt-4 font-sans text-sm text-brand-muted">
                Building invite…
              </p>
            ) : null}
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="Train together QR code"
                className="mx-auto mt-4 h-56 w-56 border border-brand-ink/10 bg-white p-2"
              />
            ) : null}
            {joinUrl ? (
              <p className="mt-3 break-all font-sans text-xs text-brand-muted">
                {joinUrl}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={primaryBtn}
                disabled={!joinUrl}
                onClick={() => void copyLink()}
              >
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
            {error ? (
              <p className="mt-2 font-sans text-xs text-red-700">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
