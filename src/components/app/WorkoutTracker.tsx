"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  DIFFICULTY_LABELS,
  type Exercise,
  type ProgressionSuggestion,
  type WorkoutSession,
  type WorkoutSet,
} from "@/lib/fitness/types";

type WorkoutTrackerProps = {
  exercises: Exercise[];
  initialSession: WorkoutSession | null;
};

export default function WorkoutTracker({
  exercises,
  initialSession,
}: WorkoutTrackerProps) {
  const [session, setSession] = useState<WorkoutSession | null>(initialSession);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [weightLb, setWeightLb] = useState("");
  const [reps, setReps] = useState("10");
  const [difficulty, setDifficulty] = useState(3);
  const [setNumber, setSetNumber] = useState(1);
  const [loggedSets, setLoggedSets] = useState<WorkoutSet[]>([]);
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => exercises.find((e) => e.id === exerciseId) ?? null,
    [exercises, exerciseId],
  );

  const loadHistory = useCallback(async (id: string) => {
    if (!id) {
      setSuggestion(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/app/workout/sets?exercise_id=${encodeURIComponent(id)}`,
      );
      const json = (await res.json()) as {
        ok?: boolean;
        suggestion?: ProgressionSuggestion | null;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setSuggestion(null);
        return;
      }
      setSuggestion(json.suggestion ?? null);
      if (json.suggestion?.suggestedWeightLb != null) {
        setWeightLb(String(json.suggestion.suggestedWeightLb));
      }
      if (json.suggestion?.suggestedReps != null) {
        setReps(String(json.suggestion.suggestedReps));
      }
    } catch {
      setSuggestion(null);
    }
  }, []);

  useEffect(() => {
    void loadHistory(exerciseId);
  }, [exerciseId, loadHistory]);

  function startSession() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/app/workout/session", { method: "POST" });
        const json = (await res.json()) as {
          ok?: boolean;
          session?: WorkoutSession;
          resumed?: boolean;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.session) {
          setError(json.error ?? "Could not start workout.");
          return;
        }
        setSession(json.session);
        setLoggedSets([]);
        setSetNumber(1);
        setMessage(
          json.resumed
            ? "Resumed your active workout session."
            : "Workout started — log your sets.",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Start failed.");
      }
    });
  }

  function finishSession() {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/app/workout/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: session.id, status: "completed" }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          session?: WorkoutSession;
          error?: string;
        };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Could not finish workout.");
          return;
        }
        setSession(null);
        setLoggedSets([]);
        setSetNumber(1);
        setMessage("Workout completed. Nice work.");
        void loadHistory(exerciseId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Finish failed.");
      }
    });
  }

  function logSet(event: React.FormEvent) {
    event.preventDefault();
    if (!session) {
      setError("Start today’s workout first.");
      return;
    }
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/app/workout/sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.id,
            exercise_id: exerciseId,
            set_number: setNumber,
            weight_lb: weightLb === "" ? null : Number(weightLb),
            reps: reps === "" ? null : Number(reps),
            difficulty,
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          set?: WorkoutSet;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.set) {
          setError(json.error ?? "Could not log set.");
          return;
        }
        setLoggedSets((prev) => [...prev, json.set!]);
        setSetNumber((n) => n + 1);
        setMessage(
          `Logged set ${json.set.set_number} — ${DIFFICULTY_LABELS[difficulty] ?? difficulty}.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Log failed.");
      }
    });
  }

  const fieldClass =
    "mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const labelClass = "block font-sans text-sm font-semibold text-brand-ink";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {!session ? (
          <button
            type="button"
            onClick={startSession}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
          >
            {pending ? "Starting…" : "Begin today’s workout"}
          </button>
        ) : (
          <>
            <span className="rounded-full bg-brand-orange/10 px-3 py-1 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
              Session active
            </span>
            <button
              type="button"
              onClick={finishSession}
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
            >
              Finish workout
            </button>
          </>
        )}
      </div>

      {suggestion ? (
        <div className="border border-brand-orange/30 bg-brand-orange/5 p-4">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
            Progression tip
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-brand-ink">
            {suggestion.message}
          </p>
          {suggestion.lastWeightLb != null ? (
            <p className="mt-1 font-sans text-xs text-brand-muted">
              Last time: {suggestion.lastWeightLb} lb × {suggestion.lastSets}{" "}
              sets
              {suggestion.lastReps != null
                ? ` of ${suggestion.lastReps}`
                : ""}{" "}
              (avg difficulty {suggestion.lastAvgDifficulty}/5)
            </p>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={logSet}
        className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6"
      >
        <div>
          <label htmlFor="exercise" className={labelClass}>
            Exercise
          </label>
          <select
            id="exercise"
            value={exerciseId}
            onChange={(e) => {
              setExerciseId(e.target.value);
              setSetNumber(1);
            }}
            className={fieldClass}
            disabled={!exercises.length}
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
                {ex.equipment ? ` (${ex.equipment})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="weight" className={labelClass}>
              Weight (lb)
            </label>
            <input
              id="weight"
              type="number"
              min={0}
              step="0.5"
              value={weightLb}
              onChange={(e) => setWeightLb(e.target.value)}
              className={fieldClass}
              placeholder={
                selected?.tracking_type === "reps_only" ? "optional" : ""
              }
            />
          </div>
          <div>
            <label htmlFor="reps" className={labelClass}>
              Reps
            </label>
            <input
              id="reps"
              type="number"
              min={0}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="setNumber" className={labelClass}>
              Set #
            </label>
            <input
              id="setNumber"
              type="number"
              min={1}
              value={setNumber}
              onChange={(e) => setSetNumber(Number(e.target.value) || 1)}
              className={fieldClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>How did it feel?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDifficulty(n)}
                className={`min-h-11 rounded-md border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] ${
                  difficulty === n
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                {n} · {DIFFICULTY_LABELS[n]}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={pending || !session || !exerciseId}
          className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Log set"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="font-sans text-sm text-brand-muted">{message}</p>
      ) : null}

      {loggedSets.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-brand-ink">
            This session
          </h2>
          <ul className="divide-y divide-brand-ink/10 border border-brand-ink/10 bg-surface-elevated">
            {loggedSets.map((set) => {
              const ex = exercises.find((e) => e.id === set.exercise_id);
              return (
                <li
                  key={set.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 font-sans text-sm"
                >
                  <span className="font-semibold text-brand-ink">
                    {ex?.name ?? "Exercise"} · set {set.set_number}
                  </span>
                  <span className="text-brand-muted">
                    {set.weight_lb != null ? `${set.weight_lb} lb × ` : ""}
                    {set.reps ?? "—"} reps ·{" "}
                    {DIFFICULTY_LABELS[set.difficulty] ?? set.difficulty}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
