"use client";

import { useState } from "react";
import SharePackSheet, {
  type SharePackPayload,
} from "@/components/app/SharePackSheet";
import type { MilestoneType } from "@/lib/fitness/milestones";

const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange";

const PRESETS: { type: MilestoneType; title: string; detail: string }[] = [
  {
    type: "personal_best",
    title: "New personal best",
    detail: "I hit a new PR in Vitality Engine.",
  },
  {
    type: "streak",
    title: "Streak is alive",
    detail: "Logged another training day in Vitality Engine.",
  },
  {
    type: "program_week",
    title: "Week in the books",
    detail: "Finished another program week in Vitality Engine.",
  },
];

export default function ShareWinCard() {
  const [title, setTitle] = useState(PRESETS[0].title);
  const [detail, setDetail] = useState(PRESETS[0].detail);
  const [type, setType] = useState<MilestoneType>("personal_best");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pack, setPack] = useState<SharePackPayload | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPack() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/share/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim() || "Win",
          detail: detail.trim() || "Training in Vitality Engine.",
        }),
      });
      const json = (await res.json()) as SharePackPayload & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not prepare share card.");
        return;
      }
      setPack({
        caption: json.caption,
        shareUrl: json.shareUrl,
        card: json.card,
        image: json.image,
      });
      setCaption(json.caption);
      setSheetOpen(true);
    } catch {
      setError("Could not prepare share card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-brand-ink/10 bg-surface-elevated p-5">
      <p className="eyebrow text-brand-orange">Share a win</p>
      <h2 className="mt-2 font-display text-xl text-brand-ink">
        Post a PR, streak, or week
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.type}
            type="button"
            className={preset.type === type ? primaryBtn : secondaryBtn}
            onClick={() => {
              setType(preset.type);
              setTitle(preset.title);
              setDetail(preset.detail);
            }}
          >
            {preset.title}
          </button>
        ))}
      </div>
      <label className="mt-4 block font-sans text-sm font-semibold text-brand-ink">
        Headline
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
        />
      </label>
      <label className="mt-3 block font-sans text-sm font-semibold text-brand-ink">
        Detail
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
        />
      </label>
      <button
        type="button"
        className={`${primaryBtn} mt-4`}
        disabled={busy}
        onClick={() => void openPack()}
      >
        {busy ? "Preparing…" : "Share a win"}
      </button>
      {error ? (
        <p className="mt-2 font-sans text-xs text-red-700">{error}</p>
      ) : null}
      <SharePackSheet
        open={sheetOpen}
        title={title}
        eyebrow="Win"
        pack={pack}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={() => setSheetOpen(false)}
        filename="vitality-engine-win.png"
        eventKind={type}
      />
    </section>
  );
}
