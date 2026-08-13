"use client";

import { useState } from "react";
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

  const youtubeId = extractYoutubeId(exercise.youtube_url);
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
          {youtubeId ? (
            <div className="mt-3 aspect-video w-full overflow-hidden bg-black">
              <iframe
                title={`${exercise.name} how-to`}
                src={`https://www.youtube.com/embed/${youtubeId}`}
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

function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }
    const v = u.searchParams.get("v");
    if (v) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    const shorts = parts.indexOf("shorts");
    if (shorts >= 0) return parts[shorts + 1] ?? null;
    const embed = parts.indexOf("embed");
    if (embed >= 0) return parts[embed + 1] ?? null;
  } catch {
    return null;
  }
  return null;
}
