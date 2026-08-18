"use client";

import { useEffect, useMemo, useState } from "react";
import WorkoutAgent, {
  type NestedProgramDay,
  type NestedWorkoutProgram,
} from "@/components/app/WorkoutAgent";
import WorkoutRunner from "@/components/app/WorkoutRunner";
import WorkoutTracker from "@/components/app/WorkoutTracker";
import ProgramTemplatesPanel from "@/components/app/ProgramTemplatesPanel";
import WorkoutSafetyNote from "@/components/legal/WorkoutSafetyNote";
import { syntheticDayFromSnapshot, type PairedDaySnapshot } from "@/lib/fitness/workout-pairing";
import type {
  Exercise,
  PrimaryGoal,
  TrainingPreferences,
  WorkoutSession,
} from "@/lib/fitness/types";

type WorkoutWorkspaceProps = {
  initialProgram: NestedWorkoutProgram | null;
  initialPrefs: TrainingPreferences;
  exercises: Exercise[];
  initialSession: WorkoutSession | null;
  /** From fitness_profiles; used when program goal is missing (freeform). */
  profileGoal?: PrimaryGoal | null;
};

function findDayById(
  program: NestedWorkoutProgram | null,
  dayId: string | null | undefined,
): NestedProgramDay | null {
  if (!program || !dayId) return null;
  return program.days.find((d) => d.id === dayId) ?? null;
}

function enrichDay(
  day: NestedProgramDay,
  catalogById: Map<string, Exercise>,
): NestedProgramDay {
  return {
    ...day,
    exercises: [...(day.exercises ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        ...row,
        exercise:
          row.exercise ??
          (catalogById.get(row.exercise_id)
            ? {
                id: catalogById.get(row.exercise_id)!.id,
                name: catalogById.get(row.exercise_id)!.name,
                category: catalogById.get(row.exercise_id)!.category,
                primary_muscle:
                  catalogById.get(row.exercise_id)!.primary_muscle,
                equipment: catalogById.get(row.exercise_id)!.equipment,
                tracking_type: catalogById.get(row.exercise_id)!.tracking_type,
              }
            : null),
      })),
  };
}

export default function WorkoutWorkspace({
  initialProgram,
  initialPrefs,
  exercises,
  initialSession,
  profileGoal = null,
}: WorkoutWorkspaceProps) {
  const [program, setProgram] = useState(initialProgram);
  const [session, setSession] = useState(initialSession);
  const [runningDay, setRunningDay] = useState<NestedProgramDay | null>(() =>
    findDayById(initialProgram, initialSession?.program_day_id),
  );
  const [paired, setPaired] = useState(
    initialSession?.session_source === "paired" ||
      Boolean(initialSession?.paired_invite_id),
  );

  const effectiveGoal = program?.primary_goal ?? profileGoal ?? null;
  const focusMode = Boolean(runningDay);

  const catalogById = useMemo(() => {
    const map = new Map(exercises.map((ex) => [ex.id, ex]));
    return map;
  }, [exercises]);

  useEffect(() => {
    const inviteId = session?.paired_invite_id;
    if (!inviteId && typeof window === "undefined") return;
    let token: string | null = null;
    try {
      token = sessionStorage.getItem("vs_paired_invite_token");
    } catch {
      token = null;
    }
    if (!inviteId && !token) return;
    if (runningDay?.id.startsWith("paired-")) return;

    let cancelled = false;
    (async () => {
      const qs = token
        ? `token=${encodeURIComponent(token)}`
        : `invite_id=${encodeURIComponent(inviteId ?? "")}`;
      const res = await fetch(`/api/app/workout/pair?${qs}`);
      const json = (await res.json()) as {
        ok?: boolean;
        invite?: { id?: string; snapshot?: PairedDaySnapshot };
      };
      if (cancelled || !res.ok || !json.ok || !json.invite?.snapshot) return;
      const day = syntheticDayFromSnapshot(
        (json.invite.id as string) ?? inviteId ?? "join",
        json.invite.snapshot,
      );
      setRunningDay(enrichDay(day, catalogById));
      setPaired(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.paired_invite_id, catalogById, runningDay?.id]);

  function handleStartDay(day: NestedProgramDay) {
    setRunningDay(enrichDay(day, catalogById));
    window.requestAnimationFrame(() => {
      document.getElementById("log-workout")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleBaselinesSaved(
    programExerciseId: string,
    baseline: { baseline_weight_lb: number | null; baseline_reps: number },
  ) {
    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => ({
          ...day,
          exercises: day.exercises.map((ex) =>
            ex.id === programExerciseId
              ? {
                  ...ex,
                  baseline_weight_lb: baseline.baseline_weight_lb,
                  baseline_reps: baseline.baseline_reps,
                }
              : ex,
          ),
        })),
      };
    });
    setRunningDay((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === programExerciseId
            ? {
                ...ex,
                baseline_weight_lb: baseline.baseline_weight_lb,
                baseline_reps: baseline.baseline_reps,
              }
            : ex,
        ),
      };
    });
  }

  function handleRunningDayChange(nextDay: NestedProgramDay) {
    const enriched = enrichDay(nextDay, catalogById);
    setRunningDay(enriched);
    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) => (d.id === enriched.id ? enriched : d)),
      };
    });
  }

  return (
    <div className="space-y-6">
      <WorkoutSafetyNote />
      {!focusMode ? (
        <header className="space-y-3">
          <p className="eyebrow text-brand-orange">Training</p>
          <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
            Workout Agent
          </h1>
          <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
            Bring your own split or let AI draft one. Start a programmed day,
            set baselines, and log sets. Evaluate with AI anytime. Freeform
            logging is still available.
          </p>
        </header>
      ) : null}

      <WorkoutAgent
        initialProgram={program}
        initialPrefs={initialPrefs}
        catalog={exercises}
        onProgramChange={(next) => {
          setProgram(next);
          setRunningDay((prev) => {
            if (!prev || !next) return prev;
            const updated = next.days.find((d) => d.id === prev.id);
            if (!updated) return prev;
            return enrichDay(updated, catalogById);
          });
        }}
        onStartDay={handleStartDay}
        runningDayId={runningDay?.id ?? null}
      />

      {!focusMode ? (
        <ProgramTemplatesPanel hasActiveProgram={Boolean(program)} />
      ) : null}

      <section id="log-workout" className="space-y-4 scroll-mt-24">
        {runningDay ? (
          <WorkoutRunner
            day={runningDay}
            catalog={exercises}
            initialSession={session}
            onSessionChange={setSession}
            onBaselinesSaved={handleBaselinesSaved}
            onDayChange={handleRunningDayChange}
            primaryGoal={effectiveGoal}
            paired={paired || runningDay.id.startsWith("paired-")}
            onExit={() => {
              setRunningDay(null);
              setPaired(false);
              try {
                sessionStorage.removeItem("vs_paired_invite_token");
              } catch {
                // ignore
              }
            }}
          />
        ) : (
          <>
            <header className="space-y-2">
              <h2 className="font-display text-xl text-brand-ink">
                Log today’s workout
              </h2>
              <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
                Pick a program day above to run the guided session, or log
                freeform sets here.
              </p>
            </header>
            <WorkoutTracker
              exercises={exercises}
              initialSession={session}
              primaryGoal={effectiveGoal}
              onSessionChange={setSession}
            />
          </>
        )}
      </section>
    </div>
  );
}
