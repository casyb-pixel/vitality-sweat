"use client";

import { useMemo, useState } from "react";
import WorkoutAgent, {
  type NestedProgramDay,
  type NestedWorkoutProgram,
} from "@/components/app/WorkoutAgent";
import WorkoutRunner from "@/components/app/WorkoutRunner";
import WorkoutTracker from "@/components/app/WorkoutTracker";
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

  const effectiveGoal =
    program?.primary_goal ?? profileGoal ?? null;

  const catalogById = useMemo(() => {
    const map = new Map(exercises.map((ex) => [ex.id, ex]));
    return map;
  }, [exercises]);

  function handleStartDay(day: NestedProgramDay) {
    // Ensure exercise names are present from catalog when nested join is thin.
    const enriched: NestedProgramDay = {
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
                }
              : null),
        })),
    };
    setRunningDay(enriched);
    // Scroll into the runner.
    window.requestAnimationFrame(() => {
      document.getElementById("log-workout")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleBaselinesSaved(
    programExerciseId: string,
    baseline: { baseline_weight_lb: number; baseline_reps: number },
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

  return (
    <>
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
            return {
              ...updated,
              exercises: [...(updated.exercises ?? [])]
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
                        }
                      : null),
                })),
            };
          });
        }}
        onStartDay={handleStartDay}
        runningDayId={runningDay?.id ?? null}
      />

      <section id="log-workout" className="space-y-6 scroll-mt-24">
        {runningDay ? (
          <>
            <header className="space-y-2">
              <h2 className="font-display text-xl text-brand-ink">
                Running {runningDay.label}
              </h2>
              <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
                Follow the prescription, set a baseline if needed, then log each
                set with how hard it felt.
              </p>
            </header>
            <WorkoutRunner
              day={runningDay}
              initialSession={session}
              onSessionChange={setSession}
              onBaselinesSaved={handleBaselinesSaved}
              primaryGoal={effectiveGoal}
              onExit={() => setRunningDay(null)}
            />
          </>
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
    </>
  );
}
