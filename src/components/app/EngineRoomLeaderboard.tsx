"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardBoard, LeaderboardClass } from "@/lib/fitness/leaderboard";

const CLASSES: { id: LeaderboardClass; label: string }[] = [
  { id: "strength", label: "Strength" },
  { id: "endurance", label: "Endurance" },
  { id: "weight_loss", label: "Weight loss" },
];

const MEDAL_LABEL: Record<string, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

export default function EngineRoomLeaderboard() {
  const [klass, setKlass] = useState<LeaderboardClass>("strength");
  const [boards, setBoards] = useState<LeaderboardBoard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async (nextClass: LeaderboardClass) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/app/engine-room/leaderboard?class=${encodeURIComponent(nextClass)}`,
      );
      const json = (await res.json()) as {
        ok?: boolean;
        optedIn?: boolean;
        boards?: LeaderboardBoard[];
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not load leaderboards.");
        return;
      }
      if (json.optedIn === false) {
        setBoards([]);
        setError("Leaderboards are off in Settings.");
        return;
      }
      setBoards(json.boards ?? []);
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void load(klass);
  }, [klass, load]);

  return (
    <section className="space-y-4">
      <p className="font-sans text-sm text-brand-muted">
        Pound-for-pound strength, endurance marks, and percent of bodyweight
        lost. Gold, silver, and bronze among members who opted in.
      </p>
      <div className="flex flex-wrap gap-2">
        {CLASSES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKlass(item.id)}
            className={`inline-flex min-h-10 items-center justify-center border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] ${
              klass === item.id
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {pending ? (
        <p className="font-sans text-sm text-brand-muted">Loading boards…</p>
      ) : null}
      {error ? (
        <p role="alert" className="font-sans text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {!pending && !error && boards.length === 0 ? (
        <p className="font-sans text-sm text-brand-muted">
          No records yet. Log working sets and weigh-ins to set the bar.
        </p>
      ) : null}
      <ul className="space-y-4">
        {boards.map((board) => (
          <li
            key={`${board.class}-${board.exerciseId ?? board.exerciseName}`}
            className="border border-brand-ink/10 bg-surface-elevated p-4"
          >
            <h3 className="font-display text-lg text-brand-ink">
              {board.exerciseName}
            </h3>
            <ol className="mt-3 space-y-2">
              {board.entries.map((entry) => (
                <li
                  key={`${entry.userId}-${entry.medal}`}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <p className="font-sans text-sm text-brand-ink">
                    <span className="font-bold uppercase tracking-[0.08em] text-brand-orange">
                      {MEDAL_LABEL[entry.medal] ?? entry.medal}
                    </span>{" "}
                    @{entry.username}
                    {entry.displayName ? ` · ${entry.displayName}` : ""}
                  </p>
                  <p className="font-sans text-xs text-brand-muted">
                    {entry.detail}
                  </p>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}
