"use client";

import { useMemo, useState } from "react";
import type {
  ChronicleDraft,
  VideoRecommendation,
} from "@/lib/chronicles/drafts";

type AiDirectorProps = {
  drafts: ChronicleDraft[];
  recommendations: VideoRecommendation[];
  onApplyCaption?: (caption: string) => void;
  onSelectRecommendation?: (recommendation: VideoRecommendation) => void;
};

export default function AiDirector({
  drafts,
  recommendations,
  onApplyCaption,
  onSelectRecommendation,
}: AiDirectorProps) {
  const [activeId, setActiveId] = useState<string | null>(
    recommendations[0]?.id ?? null,
  );

  const active = useMemo(
    () => recommendations.find((r) => r.id === activeId) ?? null,
    [activeId, recommendations],
  );

  const draftById = useMemo(() => {
    const map = new Map(drafts.map((d) => [d.id, d]));
    return map;
  }, [drafts]);

  return (
    <section className="rounded-none border border-brand-ink/10 bg-surface-elevated">
      <header className="border-b border-brand-ink/10 px-4 py-4 sm:px-5">
        <p className="eyebrow text-brand-orange">AI Director</p>
        <h2 className="mt-1 font-display text-2xl text-brand-ink sm:text-[1.75rem]">
          Content assistant
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
          Cross-references recent Sweatlife Chronicles drafts and suggests
          matching workout / field clips for social.
        </p>
      </header>

      <div className="grid gap-0 lg:grid-cols-5">
        <div className="border-b border-brand-ink/10 px-4 py-4 lg:col-span-2 lg:border-b-0 lg:border-r sm:px-5">
          <p className="eyebrow mb-3">Draft queue</p>
          <ul className="flex flex-col gap-2">
            {drafts.map((draft) => {
              const related = recommendations.find((r) => r.draftId === draft.id);
              const selected = related?.id === activeId;
              return (
                <li key={draft.id}>
                  <button
                    type="button"
                    onClick={() => related && setActiveId(related.id)}
                    className={`w-full border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-brand-orange bg-brand-orange/8"
                        : "border-brand-ink/10 bg-surface hover:border-brand-ink/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-sm font-semibold text-brand-ink">
                        {draft.title}
                      </span>
                      <span className="shrink-0 font-sans text-[0.65rem] font-bold uppercase tracking-wider text-brand-muted">
                        {draft.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 font-sans text-xs leading-relaxed text-brand-muted">
                      {draft.excerpt}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-4 py-4 lg:col-span-3 sm:px-5 sm:py-5">
          {active ? (
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Matched recommendation</p>
                <h3 className="mt-2 font-display text-xl text-brand-ink">
                  {active.draftTitle}
                </h3>
                <p className="mt-1 font-sans text-xs text-brand-muted">
                  Format · {active.suggestedFormat} ·{" "}
                  {Math.round(active.confidence * 100)}% fit
                </p>
              </div>

              <div className="space-y-3 border border-dashed border-brand-muted/35 bg-surface p-4">
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  Hook
                </p>
                <p className="font-sans text-sm leading-relaxed text-brand-muted">
                  {active.hook}
                </p>
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  Shoot cue
                </p>
                <p className="font-sans text-sm leading-relaxed text-brand-muted">
                  {active.workoutCue}
                </p>
                <p className="font-sans text-xs uppercase tracking-wider text-brand-muted">
                  Platforms · {active.platforms.join(" · ")}
                </p>
                {draftById.get(active.draftId)?.tags ? (
                  <p className="font-sans text-xs text-brand-muted">
                    Tags ·{" "}
                    {draftById.get(active.draftId)!.tags.join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRecommendation?.(active);
                    onApplyCaption?.(
                      `${active.hook}\n\n${active.workoutCue}\n\n#VitalitySweat #Sweatlife`,
                    );
                  }}
                  className="inline-flex items-center justify-center bg-brand-orange px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
                >
                  Push caption to canvas
                </button>
                <button
                  type="button"
                  onClick={() => onSelectRecommendation?.(active)}
                  className="inline-flex items-center justify-center border border-brand-ink/20 bg-surface-elevated px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange"
                >
                  Queue this shoot
                </button>
              </div>
            </div>
          ) : (
            <p className="font-sans text-sm text-brand-muted">
              No draft recommendations yet. Add a Chronicles draft to unlock
              AI Director cues.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
