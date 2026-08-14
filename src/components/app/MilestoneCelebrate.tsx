"use client";

import { useEffect, useState } from "react";
import SharePackSheet, {
  type SharePackPayload,
} from "@/components/app/SharePackSheet";
import {
  trackShareMilestoneComplete,
  trackShareMilestoneIntent,
} from "@/lib/analytics/ga";
import {
  milestoneChipPrompt,
  type WorkoutMilestone,
} from "@/lib/fitness/milestones";

type MilestoneCelebrateProps = {
  milestone: WorkoutMilestone | null;
  onDismiss: () => void;
  onPostToEngineRoom?: (milestone: WorkoutMilestone) => void;
};

const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";
const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-brand-orange-deep disabled:opacity-60";

export default function MilestoneCelebrate({
  milestone,
  onDismiss,
  onPostToEngineRoom,
}: MilestoneCelebrateProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pack, setPack] = useState<SharePackPayload | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSheetOpen(false);
    setPack(null);
    setCaption("");
    setError(null);
  }, [milestone?.title, milestone?.type, milestone?.detail]);

  if (!milestone) return null;

  async function openSheet() {
    setError(null);
    setBusy(true);
    trackShareMilestoneIntent(milestone!.type);
    try {
      const res = await fetch("/api/app/share/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: milestone!.type,
          title: milestone!.title,
          detail: milestone!.detail,
          exercise_id: milestone!.exercise_id,
          stats: milestone!.stats,
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
    <div className="space-y-2" aria-live="polite">
      {!sheetOpen ? (
        <div className="relative border border-brand-orange/25 bg-brand-orange/5 px-3 py-2.5 pr-9">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
            Milestone
          </p>
          <p className="mt-0.5 font-sans text-sm font-semibold text-brand-ink">
            {milestoneChipPrompt(milestone)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void openSheet()}
              disabled={busy}
            >
              {busy ? "Preparing…" : "Celebrate"}
            </button>
            <button type="button" className={secondaryBtn} onClick={onDismiss}>
              Not now
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-2 top-2 font-sans text-xs font-semibold text-brand-muted hover:text-brand-ink"
            aria-label="Dismiss milestone"
          >
            Close
          </button>
          {error ? (
            <p className="mt-2 font-sans text-xs text-red-700">{error}</p>
          ) : null}
        </div>
      ) : null}

      <SharePackSheet
        open={sheetOpen}
        title={milestone.title}
        eyebrow="Celebrate"
        pack={pack}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={() => {
          setSheetOpen(false);
          onDismiss();
        }}
        filename={`vitality-milestone-${milestone.type}.png`}
        eventKind={milestone.type}
        extraActions={
          onPostToEngineRoom ? (
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                trackShareMilestoneComplete(milestone.type, "copy_caption");
                onPostToEngineRoom(milestone);
              }}
            >
              Post to The Engine Room
            </button>
          ) : null
        }
      />
    </div>
  );
}
