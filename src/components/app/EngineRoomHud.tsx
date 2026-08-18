"use client";

import { RANK_BAND_LABEL, type RankBand } from "@/lib/engine-room/ranks";
import type { WeeklyQuest } from "@/lib/engine-room/quests";
import type { EngineRoomStreak, RankHighlight } from "@/lib/engine-room/snapshot";

export default function EngineRoomHud({
  streak,
  quests,
  rankHighlights,
}: {
  streak: EngineRoomStreak;
  quests: WeeklyQuest[];
  rankHighlights: RankHighlight[];
}) {
  return (
    <section className="border border-brand-orange/30 bg-brand-orange/5 p-5">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
        Your loop
      </p>
      <p className="mt-2 font-display text-2xl text-brand-ink">
        {streak.currentCount > 0
          ? `${streak.currentCount}-day streak`
          : "No streak yet"}
      </p>
      <p className="mt-1 font-sans text-sm text-brand-muted">
        Post a finished session within 3 days to keep it. Rest days in the gap
        count.
      </p>
      <ul className="mt-4 space-y-2">
        {quests.map((quest) => (
          <li key={quest.id} className="font-sans text-sm text-brand-ink">
            <span className="font-semibold">
              {quest.done ? "Done" : `${quest.progress}/${quest.target}`}
            </span>
            {": "}
            {quest.label}
          </li>
        ))}
      </ul>
      {rankHighlights.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {rankHighlights.map((rank) => (
            <li
              key={`${rank.exerciseName}-${rank.detail}`}
              className="font-sans text-sm text-brand-ink"
            >
              <span className="font-semibold text-brand-orange">
                {rank.band ? RANK_BAND_LABEL[rank.band as RankBand] : "Unranked"}
              </span>
              {" · "}
              {rank.exerciseName}
              {": "}
              {rank.detail}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 font-sans text-sm text-brand-muted">
          Finish a workout, then post it here to lock a rank.
        </p>
      )}
    </section>
  );
}
