"use client";

import { useEffect, useState } from "react";

type Score = {
  score: number;
  training: number;
  overload: number;
  fuel: number;
  recovery: number;
  streakDays: number;
};

export default function SweatScoreCard() {
  const [score, setScore] = useState<Score | null>(null);
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/app/sweat-score");
      const json = (await res.json()) as { ok?: boolean; score?: Score };
      if (json.ok && json.score) setScore(json.score);
    })();
  }, []);
  if (!score) return null;
  return (
    <section className="border border-brand-orange/30 bg-brand-orange/5 p-5">
      <p className="eyebrow text-brand-orange">Sweat Score</p>
      <p className="mt-2 font-display text-5xl text-brand-ink">{score.score}</p>
      <p className="mt-1 font-sans text-sm text-brand-muted">
        {score.streakDays}-day streak · train {score.training} · overload{" "}
        {score.overload} · fuel {score.fuel} · recovery {score.recovery}
      </p>
    </section>
  );
}
