"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { NestedProgramDay, NestedProgramExercise } from "@/components/app/WorkoutAgent";
import {
  buildExercisePrescription,
  prescriptionToSnapshot,
  type ExercisePrescription,
  type LastPrescription,
} from "@/lib/fitness/prescription";
import {
  fetchExerciseSuggestion,
  fetchSessionSets,
  finishWorkoutSession,
  logWorkoutSet,
  saveProgramExerciseBaseline,
  saveProgramExercisePrescription,
  startWorkoutSession,
} from "@/lib/fitness/workout-logging";
import InviteFriendsPrompt from "@/components/auth/InviteFriendsPrompt";
import MilestoneCelebrate from "@/components/app/MilestoneCelebrate";
import RunnerExerciseEditSheet from "@/components/app/RunnerExerciseEditSheet";
import WorkoutRestCoach from "@/components/app/WorkoutRestCoach";
import ExerciseHowToSheet from "@/components/app/ExerciseHowToSheet";
import { nextSupersetIndex } from "@/lib/fitness/supersets";
import type { WorkoutMilestone } from "@/lib/fitness/milestones";
import {
  DIFFICULTY_LABELS,
  WORKOUT_SET_STYLE_COACHING,
  WORKOUT_SET_STYLE_LABELS,
  type Exercise,
  type PrimaryGoal,
  type WorkoutSession,
  type WorkoutSet,
  type WorkoutSetStyle,
} from "@/lib/fitness/types";

type WorkoutRunnerProps = {
  day: NestedProgramDay;
  catalog?: Exercise[];
  initialSession: WorkoutSession | null;
  onSessionChange: (session: WorkoutSession | null) => void;
  onExit: () => void;
  primaryGoal?: PrimaryGoal | null;
  onDayChange?: (day: NestedProgramDay) => void;
  onBaselinesSaved?: (
    programExerciseId: string,
    baseline: { baseline_weight_lb: number; baseline_reps: number },
  ) => void;
};

type CatchUpRow = {
  setNumber: number;
  reps: string;
  difficulty: number;
};

function styleCoaching(style: WorkoutSetStyle | string): string {
  if (style in WORKOUT_SET_STYLE_COACHING) {
    return WORKOUT_SET_STYLE_COACHING[style as WorkoutSetStyle];
  }
  return "Train with control and leave a clean last rep.";
}

function styleLabel(style: WorkoutSetStyle | string): string {
  if (style in WORKOUT_SET_STYLE_LABELS) {
    return WORKOUT_SET_STYLE_LABELS[style as WorkoutSetStyle];
  }
  return String(style);
}

function formatPrescription(ex: NestedProgramExercise): string {
  const reps =
    ex.rep_min != null && ex.rep_max != null
      ? ex.rep_min === ex.rep_max
        ? `${ex.rep_min} reps`
        : `${ex.rep_min}-${ex.rep_max} reps`
      : ex.rep_min != null
        ? `${ex.rep_min}+ reps`
        : ex.rep_max != null
          ? `up to ${ex.rep_max} reps`
          : "reps as prescribed";
  return `${ex.sets} × ${reps}`;
}

function targetReps(ex: NestedProgramExercise): number {
  if (ex.baseline_reps != null && ex.baseline_reps > 0) return ex.baseline_reps;
  if (ex.rep_min != null && ex.rep_max != null) {
    return Math.round((ex.rep_min + ex.rep_max) / 2);
  }
  return ex.rep_min ?? ex.rep_max ?? 10;
}

export default function WorkoutRunner({
  day,
  catalog = [],
  initialSession,
  onSessionChange,
  onExit,
  primaryGoal = null,
  onDayChange,
  onBaselinesSaved,
}: WorkoutRunnerProps) {
  const exercises = useMemo(
    () =>
      [...(day.exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [day.exercises],
  );

  const [session, setSession] = useState<WorkoutSession | null>(initialSession);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [loggedSets, setLoggedSets] = useState<WorkoutSet[]>([]);
  const [localExercises, setLocalExercises] =
    useState<NestedProgramExercise[]>(exercises);
  const [phase, setPhase] = useState<"baseline" | "log" | "catchup">("log");
  const [baselineWeight, setBaselineWeight] = useState("");
  const [baselineReps, setBaselineReps] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [reps, setReps] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [prescription, setPrescription] =
    useState<ExercisePrescription | null>(null);
  const [catchUp, setCatchUp] = useState<CatchUpRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [booting, setBooting] = useState(true);
  const [restTrigger, setRestTrigger] = useState(0);
  const [milestone, setMilestone] = useState<WorkoutMilestone | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const focusKeyRef = useRef<string>("");

  // Keep local list in sync when plan edits land from the edit sheet / parent.
  useEffect(() => {
    setLocalExercises(exercises);
    setExerciseIndex((idx) => {
      if (exercises.length === 0) return 0;
      return Math.min(idx, exercises.length - 1);
    });
  }, [exercises]);

  const current = localExercises[exerciseIndex] ?? null;
  const nextExercise = localExercises[exerciseIndex + 1] ?? null;
  const currentSets = useMemo(() => {
    if (!current) return [];
    return loggedSets
      .filter((s) => s.exercise_id === current.exercise_id)
      .sort((a, b) => a.set_number - b.set_number);
  }, [loggedSets, current]);

  const nextSetNumber = (currentSets[currentSets.length - 1]?.set_number ?? 0) + 1;

  const applyPrefills = useCallback((rx: ExercisePrescription) => {
    if (rx.targetWeightLb != null) {
      setWeightLb(String(rx.targetWeightLb));
    } else {
      setWeightLb("");
    }
    if (rx.targetReps != null) {
      setReps(String(rx.targetReps));
    } else {
      setReps("");
    }
    setDifficulty(3);
  }, []);

  const persistPrescription = useCallback(
    async (ex: NestedProgramExercise, rx: ExercisePrescription) => {
      const snap = prescriptionToSnapshot(rx, ex.set_style);
      await saveProgramExercisePrescription({
        id: ex.id,
        lastPrescription: snap,
      });
      setLocalExercises((prev) =>
        prev.map((row) =>
          row.id === ex.id ? { ...row, last_prescription: snap } : row,
        ),
      );
    },
    [],
  );

  const enterExercise = useCallback(
    async (ex: NestedProgramExercise) => {
      setError(null);
      setCatchUp([]);
      const needsBaseline = ex.baseline_weight_lb == null;
      setPhase(needsBaseline ? "baseline" : "log");
      setBaselineWeight(
        ex.baseline_weight_lb != null ? String(ex.baseline_weight_lb) : "",
      );
      setBaselineReps(
        ex.baseline_reps != null
          ? String(ex.baseline_reps)
          : String(targetReps(ex)),
      );

      const history = await fetchExerciseSuggestion(ex.exercise_id);
      const recentSets = history.ok ? history.data.sets : [];
      const rx = buildExercisePrescription({
        exerciseId: ex.exercise_id,
        exerciseName: ex.exercise?.name ?? "Exercise",
        setStyle: ex.set_style,
        baselineWeightLb: ex.baseline_weight_lb,
        baselineReps: ex.baseline_reps,
        repMin: ex.rep_min,
        repMax: ex.rep_max,
        recentSets,
        lastPrescription: (ex.last_prescription as LastPrescription | null) ?? null,
        lastSessionAt: history.ok ? history.data.lastSessionAt : null,
      });
      setPrescription(rx);
      applyPrefills(rx);
      if (!needsBaseline) {
        void persistPrescription(ex, rx);
      }
    },
    [applyPrefills, persistPrescription],
  );

  // After swap/remove (identity change), reload coaching for the focused slot.
  useEffect(() => {
    if (booting || !current) return;
    const key = `${current.id}:${current.exercise_id}`;
    if (focusKeyRef.current === key) return;
    const first = focusKeyRef.current === "";
    focusKeyRef.current = key;
    if (first) return;
    startTransition(async () => {
      await enterExercise(current);
    });
  }, [booting, current, enterExercise]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      setBooting(true);
      setError(null);
      const started = await startWorkoutSession(day.id);
      if (cancelled) return;
      if (!started.ok) {
        setError(started.error);
        setBooting(false);
        return;
      }
      setSession(started.data.session);
      onSessionChange(started.data.session);

      const loaded = await fetchSessionSets(started.data.session.id);
      if (cancelled) return;
      const sets = loaded.ok ? loaded.data.sets : [];
      setLoggedSets(sets);

      // Resume at first incomplete exercise.
      let startIdx = 0;
      for (let i = 0; i < localExercises.length; i++) {
        const ex = localExercises[i]!;
        const count = sets.filter((s) => s.exercise_id === ex.exercise_id).length;
        if (count < ex.sets) {
          startIdx = i;
          break;
        }
        startIdx = Math.min(i + 1, localExercises.length - 1);
      }
      setExerciseIndex(startIdx);
      const ex = localExercises[startIdx];
      if (ex) await enterExercise(ex);
      setMessage(
        started.data.resumed
          ? `Resumed ${day.label}.`
          : `Started ${day.label}.`,
      );
      setBooting(false);
    });
    return () => {
      cancelled = true;
    };
    // Boot once per day selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  function saveBaseline() {
    if (!current) return;
    const weight = Number(baselineWeight);
    const expectedReps = Number(baselineReps);
    if (!Number.isFinite(weight) || weight < 0) {
      setError("Enter a starting weight (0 is ok for bodyweight).");
      return;
    }
    if (!Number.isInteger(expectedReps) || expectedReps <= 0) {
      setError("Enter how many reps you expect.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const saved = await saveProgramExerciseBaseline({
        id: current.id,
        baselineWeightLb: weight,
        baselineReps: expectedReps,
      });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }

      const updated: NestedProgramExercise = {
        ...current,
        baseline_weight_lb: saved.data.baseline_weight_lb,
        baseline_reps: saved.data.baseline_reps,
      };
      setLocalExercises((prev) =>
        prev.map((ex) => (ex.id === current.id ? updated : ex)),
      );
      onBaselinesSaved?.(current.id, saved.data);

      const history = await fetchExerciseSuggestion(updated.exercise_id);
      const recentSets = history.ok ? history.data.sets : [];
      const rx = buildExercisePrescription({
        exerciseId: updated.exercise_id,
        exerciseName: updated.exercise?.name ?? "Exercise",
        setStyle: updated.set_style,
        baselineWeightLb: updated.baseline_weight_lb,
        baselineReps: updated.baseline_reps,
        repMin: updated.rep_min,
        repMax: updated.rep_max,
        recentSets,
        lastPrescription:
          (updated.last_prescription as LastPrescription | null) ?? null,
        lastSessionAt: history.ok ? history.data.lastSessionAt : null,
      });
      setPrescription(rx);
      setPhase("log");
      applyPrefills(rx);
      void persistPrescription(updated, rx);
      setMessage("Baseline saved. Follow today’s coaching targets.");
    });
  }

  function logCurrentSet() {
    if (!session || !current) return;
    const weight = weightLb === "" ? null : Number(weightLb);
    const repCount = reps === "" ? null : Number(reps);
    if (weight != null && (!Number.isFinite(weight) || weight < 0)) {
      setError("Weight must be 0 or more.");
      return;
    }
    if (repCount == null || !Number.isInteger(repCount) || repCount < 0) {
      setError("Enter reps for this set.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await logWorkoutSet({
        sessionId: session.id,
        exerciseId: current.exercise_id,
        setNumber: nextSetNumber,
        weightLb: weight,
        reps: repCount,
        difficulty,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLoggedSets((prev) => [...prev, result.data.set]);
      const hop = nextSupersetIndex(localExercises, exerciseIndex);
      if (hop != null) {
        setExerciseIndex(hop);
        const next = localExercises[hop];
        if (next) {
          await enterExercise(next);
          setMessage(
            `Superset: ${next.exercise?.name ?? "next move"}. Rest after the group.`,
          );
        }
      } else {
        setRestTrigger((n) => n + 1);
      }
      if (result.data.milestone) {
        setMilestone(result.data.milestone);
      }
      setMessage(
        `Logged set ${result.data.set.set_number} · ${DIFFICULTY_LABELS[difficulty] ?? difficulty}.`,
      );
    });
  }

  function missingSetNumbers(ex: NestedProgramExercise, sets: WorkoutSet[]) {
    const have = new Set(
      sets
        .filter((s) => s.exercise_id === ex.exercise_id)
        .map((s) => s.set_number),
    );
    const missing: number[] = [];
    for (let n = 1; n <= ex.sets; n++) {
      if (!have.has(n)) missing.push(n);
    }
    return missing;
  }

  function incompleteSets(ex: NestedProgramExercise, sets: WorkoutSet[]) {
    return sets.filter(
      (s) =>
        s.exercise_id === ex.exercise_id &&
        (s.reps == null || s.difficulty == null),
    );
  }

  function skipCurrentExercise() {
    if (!current) return;
    const ok = window.confirm(
      `Skip ${current.exercise?.name ?? "this exercise"} for today? It stays on your plan.`,
    );
    if (!ok) return;
    setError(null);
    setMessage(`Skipped ${current.exercise?.name ?? "exercise"} for today.`);
    advanceToNext();
  }

  function tryAdvance() {
    if (!current || !session) return;
    const missing = missingSetNumbers(current, loggedSets);
    const incomplete = incompleteSets(current, loggedSets);

    if (missing.length > 0 || incomplete.length > 0) {
      const rows: CatchUpRow[] = missing.map((setNumber) => ({
        setNumber,
        reps: String(targetReps(current)),
        difficulty: 3,
      }));
      // Incomplete sets without reps: ask to re-log remaining only (no update API).
      setCatchUp(rows);
      setPhase("catchup");
      setError(null);
      setMessage(
        missing.length > 0
          ? `Finish the remaining ${missing.length} set${missing.length === 1 ? "" : "s"} for this exercise.`
          : "Fill in actuals for this exercise.",
      );
      return;
    }

    advanceToNext();
  }

  function advanceToNext() {
    setCatchUp([]);
    setPhase("log");
    if (current && prescription) {
      void persistPrescription(current, prescription);
    }
    if (exerciseIndex >= localExercises.length - 1) {
      finishDay();
      return;
    }
    const nextIdx = exerciseIndex + 1;
    setExerciseIndex(nextIdx);
    const next = localExercises[nextIdx];
    if (next) {
      startTransition(async () => {
        await enterExercise(next);
        setMessage(`Next: ${next.exercise?.name ?? "exercise"}`);
      });
    }
  }

  function submitCatchUp() {
    if (!session || !current) return;
    for (const row of catchUp) {
      const repCount = Number(row.reps);
      if (!Number.isInteger(repCount) || repCount < 0) {
        setError(`Enter reps for set ${row.setNumber}.`);
        return;
      }
    }

    setError(null);
    startTransition(async () => {
      const weight =
        current.baseline_weight_lb != null
          ? Number(current.baseline_weight_lb)
          : weightLb === ""
            ? null
            : Number(weightLb);

      const created: WorkoutSet[] = [];
      let caughtMilestone: WorkoutMilestone | null = null;
      for (const row of catchUp) {
        const result = await logWorkoutSet({
          sessionId: session.id,
          exerciseId: current.exercise_id,
          setNumber: row.setNumber,
          weightLb: weight,
          reps: Number(row.reps),
          difficulty: row.difficulty,
        });
        if (!result.ok) {
          setError(result.error);
          if (created.length) {
            setLoggedSets((prev) => [...prev, ...created]);
          }
          return;
        }
        created.push(result.data.set);
        if (result.data.milestone && !caughtMilestone) {
          caughtMilestone = result.data.milestone;
        }
      }
      setLoggedSets((prev) => [...prev, ...created]);
      if (caughtMilestone) setMilestone(caughtMilestone);
      advanceToNext();
    });
  }

  function finishDay() {
    if (!session) {
      onExit();
      return;
    }
    startTransition(async () => {
      const result = await finishWorkoutSession(session.id, "completed");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession(null);
      onSessionChange(null);
      setShowInvitePrompt(true);
      setMessage("Workout completed. Nice work.");
    });
  }

  const fieldClass =
    "mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const labelClass = "block font-sans text-sm font-semibold text-brand-ink";
  const primaryBtn =
    "inline-flex min-h-11 w-full items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60 sm:w-auto";
  const secondaryBtn =
    "inline-flex min-h-11 w-full items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60 sm:w-auto";

  if (booting) {
    return (
      <p className="font-sans text-sm text-brand-muted">
        Starting {day.label}…
      </p>
    );
  }

  if (showInvitePrompt && !session) {
    return (
      <div className="space-y-4">
        {message ? (
          <p className="font-sans text-sm text-brand-muted">{message}</p>
        ) : null}
        <InviteFriendsPrompt
          variant="post_workout"
          visible
          onDismiss={() => {
            setShowInvitePrompt(false);
            onExit();
          }}
        />
        <button type="button" onClick={onExit} className={secondaryBtn}>
          Back to plan
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-sm text-brand-muted">
          No exercises on this day.
        </p>
        <button type="button" onClick={onExit} className={secondaryBtn}>
          Back to plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow text-brand-orange">{day.label}</p>
          <p className="font-sans text-xs text-brand-muted">
            Exercise {exerciseIndex + 1} of {localExercises.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {session ? (
            <button
              type="button"
              onClick={finishDay}
              disabled={pending}
              className={secondaryBtn}
            >
              Finish
            </button>
          ) : null}
          <button
            type="button"
            onClick={onExit}
            disabled={pending}
            className={secondaryBtn}
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex gap-1" aria-hidden>
        {localExercises.map((ex, i) => (
          <span
            key={ex.id}
            className={`h-1 flex-1 ${
              i < exerciseIndex
                ? "bg-brand-orange"
                : i === exerciseIndex
                  ? "bg-brand-orange/60"
                  : "bg-brand-ink/10"
            }`}
          />
        ))}
      </div>

      {session ? (
        <WorkoutRestCoach
          sessionId={session.id}
          active={session.status === "active"}
          restTrigger={restTrigger}
          programRestSec={current.rest_sec}
          goal={primaryGoal}
          exerciseId={current.exercise_id}
          primaryMuscle={current.exercise?.primary_muscle ?? null}
        />
      ) : null}

      <MilestoneCelebrate
        milestone={milestone}
        onDismiss={() => setMilestone(null)}
      />

      <article className="space-y-3 border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-2xl text-brand-ink">
              {current.exercise?.name ?? "Exercise"}
            </h3>
            <p className="mt-1 font-sans text-sm font-semibold text-brand-ink">
              {formatPrescription(current)}
              {current.superset_group
                ? ` · superset ${current.superset_group}`
                : ""}
            </p>
            <div className="mt-2">
              <ExerciseHowToSheet
                exercise={
                  current.exercise
                    ? {
                        name: current.exercise.name,
                        primary_muscle: current.exercise.primary_muscle,
                        cues: current.exercise.cues,
                        how_to: current.exercise.how_to,
                        youtube_url: current.exercise.youtube_url,
                      }
                    : null
                }
              />
            </div>
          </div>
          {onDayChange ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={secondaryBtn}
              disabled={pending}
            >
              Edit
            </button>
          ) : null}
        </div>
        <p className="border border-brand-orange/25 bg-brand-orange/5 px-3 py-2 font-sans text-sm text-brand-ink">
          <span className="font-semibold">{styleLabel(current.set_style)}:</span>{" "}
          {styleCoaching(current.set_style)}
        </p>
        {current.coach_notes ? (
          <p className="font-sans text-xs text-brand-muted">
            {current.coach_notes}
          </p>
        ) : null}
        {current.exercise?.youtube_url ? (
          <a
            href={current.exercise.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center border-2 border-brand-orange/40 bg-brand-orange/5 px-3 py-2 font-sans text-sm font-bold text-brand-orange hover:bg-brand-orange/10"
          >
            How to: watch form video
          </a>
        ) : null}
      </article>

      {nextExercise ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-brand-ink/10 bg-white/60 px-3 py-2.5">
          <p className="font-sans text-xs text-brand-muted">
            Next up:{" "}
            <span className="font-semibold text-brand-ink">
              {nextExercise.exercise?.name ?? "Exercise"}
            </span>
          </p>
          <button
            type="button"
            className={secondaryBtn}
            disabled={pending}
            onClick={skipCurrentExercise}
            title="Skip if the machine is taken. You can come back later from your plan."
          >
            Skip forward
          </button>
        </div>
      ) : null}

      {prescription && phase === "log" ? (
        <div className="border border-brand-orange/30 bg-brand-orange/5 p-3">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
            Today&apos;s coaching
          </p>
          <p className="mt-1 font-sans text-sm leading-relaxed text-brand-ink">
            {prescription.message}
          </p>
          {(prescription.targetWeightLb != null ||
            prescription.targetReps != null) && (
            <p className="mt-2 font-sans text-xs font-semibold text-brand-muted">
              Target:{" "}
              {prescription.targetWeightLb != null
                ? `${prescription.targetWeightLb} lb`
                : "bodyweight / as planned"}
              {prescription.targetReps != null
                ? ` × ${prescription.targetReps} reps`
                : ""}
              {prescription.source === "progression"
                ? " · from last session"
                : prescription.source === "baseline"
                  ? " · from baseline"
                  : prescription.source === "hold_stale"
                    ? " · holding after time off"
                    : ""}
            </p>
          )}
        </div>
      ) : null}

      {editOpen && current && onDayChange ? (
        <RunnerExerciseEditSheet
          day={{ ...day, exercises: localExercises }}
          exercise={current}
          catalog={catalog}
          onClose={() => setEditOpen(false)}
          onDayChange={(next) => {
            onDayChange(next);
            setEditOpen(false);
          }}
        />
      ) : null}

      {phase === "baseline" ? (
        <div className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
          <h4 className="font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-orange">
            First time baseline
          </h4>
          <p className="font-sans text-sm text-brand-muted">
            What weight will you start with, and how many reps do you expect?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="baseline-weight" className={labelClass}>
                Starting weight (lb)
              </label>
              <input
                id="baseline-weight"
                type="number"
                min={0}
                step="0.5"
                value={baselineWeight}
                onChange={(e) => setBaselineWeight(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="baseline-reps" className={labelClass}>
                Expected reps
              </label>
              <input
                id="baseline-reps"
                type="number"
                min={1}
                value={baselineReps}
                onChange={(e) => setBaselineReps(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveBaseline}
            disabled={pending}
            className={primaryBtn}
          >
            {pending ? "Saving…" : "Save baseline & continue"}
          </button>
        </div>
      ) : null}

      {phase === "log" ? (
        <div className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
            Set {Math.min(nextSetNumber, current.sets)} of {current.sets}
            {currentSets.length >= current.sets ? " (extra ok)" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="run-weight" className={labelClass}>
                Weight (lb)
              </label>
              <input
                id="run-weight"
                type="number"
                min={0}
                step="0.5"
                value={weightLb}
                onChange={(e) => setWeightLb(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="run-reps" className={labelClass}>
                Reps
              </label>
              <input
                id="run-reps"
                type="number"
                min={0}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <fieldset>
            <legend className={labelClass}>How hard / intense?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDifficulty(n)}
                  className={`min-h-11 border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] ${
                    difficulty === n
                      ? "border-brand-orange bg-brand-orange text-white"
                      : "border-brand-ink/15 text-brand-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 font-sans text-xs text-brand-muted">
              {DIFFICULTY_LABELS[difficulty]}
            </p>
          </fieldset>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={logCurrentSet}
              disabled={pending || !session}
              className={primaryBtn}
            >
              {pending ? "Saving…" : "Log set"}
            </button>
            <button
              type="button"
              onClick={tryAdvance}
              disabled={pending}
              className={secondaryBtn}
            >
              {exerciseIndex >= localExercises.length - 1
                ? "Complete exercise & finish"
                : "Done with exercise"}
            </button>
            <button
              type="button"
              onClick={skipCurrentExercise}
              disabled={pending}
              className={secondaryBtn}
            >
              Skip exercise
            </button>
          </div>
        </div>
      ) : null}

      {phase === "catchup" ? (
        <div className="space-y-4 rounded-lg border border-brand-orange/30 bg-brand-orange/5 p-4 sm:p-5">
          <h4 className="font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-orange">
            Finish missing sets
          </h4>
          <p className="font-sans text-sm text-brand-muted">
            Enter actual reps and how hard each remaining set felt.
          </p>
          <ul className="space-y-3">
            {catchUp.map((row, idx) => (
              <li
                key={row.setNumber}
                className="grid gap-2 border border-brand-ink/10 bg-surface-elevated p-3 sm:grid-cols-[auto_1fr_1fr]"
              >
                <p className="font-sans text-sm font-semibold text-brand-ink sm:pt-6">
                  Set {row.setNumber}
                </p>
                <div>
                  <label className={labelClass}>Reps</label>
                  <input
                    type="number"
                    min={0}
                    value={row.reps}
                    onChange={(e) =>
                      setCatchUp((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, reps: e.target.value } : r,
                        ),
                      )
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Intensity</label>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setCatchUp((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, difficulty: n } : r,
                            ),
                          )
                        }
                        className={`min-h-10 min-w-10 border font-sans text-xs font-bold ${
                          row.difficulty === n
                            ? "border-brand-orange bg-brand-orange text-white"
                            : "border-brand-ink/15 text-brand-ink"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={submitCatchUp}
              disabled={pending || catchUp.length === 0}
              className={primaryBtn}
            >
              {pending ? "Saving…" : "Save & continue"}
            </button>
            <button
              type="button"
              onClick={advanceToNext}
              disabled={pending}
              className={secondaryBtn}
            >
              Skip remaining
            </button>
          </div>
        </div>
      ) : null}

      {currentSets.length > 0 ? (
        <section className="space-y-2">
          <h4 className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
            Logged this exercise
          </h4>
          <ul className="divide-y divide-brand-ink/10 border border-brand-ink/10 bg-surface-elevated">
            {currentSets.map((set) => (
              <li
                key={set.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 font-sans text-sm"
              >
                <span className="font-semibold text-brand-ink">
                  Set {set.set_number}
                </span>
                <span className="text-brand-muted">
                  {set.weight_lb != null ? `${set.weight_lb} lb × ` : ""}
                  {set.reps ?? "-"} ·{" "}
                  {DIFFICULTY_LABELS[set.difficulty] ?? set.difficulty}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
    </div>
  );
}
