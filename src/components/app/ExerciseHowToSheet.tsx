"use client";

import { useState } from "react";
import { toYouTubeEmbedSrc } from "@/lib/blog/video-embeds";
import type { Exercise } from "@/lib/fitness/types";

export default function ExerciseHowToSheet({
  exercise,
}: {
  exercise: Pick<
    Exercise,
    "name" | "cues" | "how_to" | "youtube_url" | "primary_muscle"
  > | null;
}) {
  const [open, setOpen] = useState(false);
  if (!exercise) return null;

  const embedSrc = exercise.youtube_url
    ? toYouTubeEmbedSrc(exercise.youtube_url, { autoplay: false })
    : null;
  const cues = exercise.cues?.filter(Boolean) ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
      >
        {open ? "Hide how-to" : `How to ${exercise.name}`}
      </button>
      {open ? (
        <div className="mt-3 border border-brand-ink/10 bg-surface-elevated p-4">
          {exercise.primary_muscle ? (
            <p className="font-sans text-xs uppercase tracking-[0.1em] text-brand-muted">
              {exercise.primary_muscle}
            </p>
          ) : null}
          {exercise.how_to ? (
            <p className="mt-2 font-sans text-sm leading-relaxed text-brand-ink">
              {exercise.how_to}
            </p>
          ) : (
            <p className="mt-2 font-sans text-sm text-brand-muted">
              Plant, brace, own the range. Log it in Engine after the set.
            </p>
          )}
          {cues.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm text-brand-ink">
              {cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          ) : null}
          {embedSrc ? (
            <div className="mt-3 aspect-video w-full overflow-hidden bg-black">
              <iframe
                title={`${exercise.name} how-to`}
                src={embedSrc}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
