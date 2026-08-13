"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatWeight } from "@/lib/fitness/units";

type Point = {
  sessionId: string;
  startedAt: string | null;
  sets: number;
  bestWeightLb: number | null;
  volume: number;
  estimated1rmLb: number | null;
};

export default function WorkoutProgressClient() {
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [exerciseId, setExerciseId] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [totals, setTotals] = useState({ sessions: 0, sets: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setError(null);
    const qs = id ? `?exercise_id=${encodeURIComponent(id)}` : "";
    const res = await fetch(`/api/app/workout/progress${qs}`);
    const json = (await res.json()) as {
      ok?: boolean;
      points?: Point[];
      exercises?: { id: string; name: string }[];
      totals?: { sessions: number; sets: number };
      error?: string;
    };
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Could not load progress.");
      return;
    }
    setPoints(json.points ?? []);
    setExercises(json.exercises ?? []);
    setTotals(json.totals ?? { sessions: 0, sets: 0 });
  }, []);

  useEffect(() => {
    void load(exerciseId);
  }, [exerciseId, load]);

  const maxVolume = useMemo(
    () => Math.max(1, ...points.map((p) => p.volume)),
    [points],
  );
  const latest = points[points.length - 1] ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">Progress</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Proof you are getting stronger
        </h1>
        <p className="max-w-xl font-sans text-sm text-brand-muted">
          Best set, session volume, and estimated 1RM (Epley). Estimates only,
          not a tested max.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Completed sessions" value={String(totals.sessions)} />
        <Stat label="Logged sets" value={String(totals.sets)} />
        <Stat
          label="Latest est. 1RM"
          value={
            latest?.estimated1rmLb != null
              ? formatWeight(latest.estimated1rmLb, "imperial")
              : "-"
          }
        />
      </div>

      <label className="block font-sans text-sm font-semibold text-brand-ink">
        Exercise
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm"
        >
          <option value="">All lifts</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}

      {points.length === 0 ? (
        <p className="font-sans text-sm text-brand-muted">
          Finish a workout and charts will show up here.
        </p>
      ) : (
        <div className="border border-brand-ink/10 bg-surface-elevated p-4">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
            Volume by session
          </p>
          <div className="mt-4 flex h-40 items-end gap-1">
            {points.map((point) => (
              <div
                key={point.sessionId}
                className="flex-1 bg-brand-orange/80"
                style={{ height: `${(point.volume / maxVolume) * 100}%` }}
                title={`${point.startedAt ?? ""} · ${Math.round(point.volume)} lb volume`}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {points.slice(-8).reverse().map((point) => (
              <li
                key={point.sessionId}
                className="flex justify-between gap-3 font-sans text-xs text-brand-muted"
              >
                <span>
                  {point.startedAt
                    ? new Date(point.startedAt).toLocaleDateString()
                    : "Session"}
                </span>
                <span>
                  Best {formatWeight(point.bestWeightLb, "imperial")} · vol{" "}
                  {Math.round(point.volume)} · e1RM{" "}
                  {formatWeight(point.estimated1rmLb, "imperial")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-ink/10 bg-surface-elevated px-4 py-3">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-brand-ink">{value}</p>
    </div>
  );
}
