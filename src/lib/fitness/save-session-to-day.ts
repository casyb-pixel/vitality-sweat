import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultPrescriptionForStyle,
  defaultStyleForProgramGoal,
  markProgramDayCustomized,
} from "@/lib/fitness/plan-edits";
import type { PrimaryGoal, WorkoutProgramDayKind } from "@/lib/fitness/types";

const TEMPLATE_SET_KINDS = new Set(["working", "drop", "failure", "timed"]);
const MAX_SETS = 12;

export type LoggedSetLike = {
  exercise_id: string;
  set_kind?: string | null;
  reps?: number | null;
  created_at?: string;
};

export type SessionDayExerciseDraft = {
  exercise_id: string;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
};

export function isSyntheticProgramDayId(
  dayId: string | null | undefined,
): boolean {
  return Boolean(dayId && dayId.startsWith("paired-"));
}

function countsTowardTemplate(setKind: string | null | undefined): boolean {
  if (setKind == null || setKind === "") return true;
  return TEMPLATE_SET_KINDS.has(setKind);
}

function clampSets(count: number): number {
  return Math.min(MAX_SETS, Math.max(1, count));
}

/** Group logged sets into a day template: first-seen order, working-set counts. */
export function sessionExercisesFromSets(
  sets: LoggedSetLike[],
): SessionDayExerciseDraft[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  const repMins = new Map<string, number>();
  const repMaxs = new Map<string, number>();

  for (const set of sets) {
    const exerciseId = set.exercise_id?.trim();
    if (!exerciseId) continue;
    if (!countsTowardTemplate(set.set_kind)) continue;

    if (!counts.has(exerciseId)) {
      order.push(exerciseId);
      counts.set(exerciseId, 0);
    }
    counts.set(exerciseId, (counts.get(exerciseId) ?? 0) + 1);

    const reps = set.reps;
    if (typeof reps === "number" && Number.isInteger(reps) && reps > 0) {
      const prevMin = repMins.get(exerciseId);
      const prevMax = repMaxs.get(exerciseId);
      repMins.set(
        exerciseId,
        prevMin == null ? reps : Math.min(prevMin, reps),
      );
      repMaxs.set(
        exerciseId,
        prevMax == null ? reps : Math.max(prevMax, reps),
      );
    }
  }

  return order.map((exercise_id) => {
    const rawSets = counts.get(exercise_id) ?? 0;
    const repMin = repMins.get(exercise_id) ?? null;
    const repMax = repMaxs.get(exercise_id) ?? null;
    return {
      exercise_id,
      sets: clampSets(rawSets),
      rep_min: repMin,
      rep_max: repMax != null && repMin != null && repMax < repMin ? repMin : repMax,
    };
  });
}

export function exercisesToInsert(
  logged: SessionDayExerciseDraft[],
  existingExerciseIds: Iterable<string>,
): SessionDayExerciseDraft[] {
  const existing = new Set(existingExerciseIds);
  return logged.filter((row) => !existing.has(row.exercise_id));
}

export function suggestedScheduledDay<
  T extends { day_kind?: WorkoutProgramDayKind | string | null },
>(days: T[], now = new Date()): T | null {
  const scheduled = days.filter(
    (day) => (day.day_kind ?? "scheduled") === "scheduled",
  );
  if (scheduled.length === 0) return null;
  return scheduled[now.getDay() % scheduled.length] ?? scheduled[0] ?? null;
}

export function resolveRepeatTargetDayId(input: {
  sessionProgramDayId: string | null | undefined;
  activeDays: Array<{
    id: string;
    day_kind?: WorkoutProgramDayKind | string | null;
  }>;
  now?: Date;
}): string | null {
  const sessionDayId = input.sessionProgramDayId?.trim() || null;
  if (
    sessionDayId &&
    !isSyntheticProgramDayId(sessionDayId) &&
    input.activeDays.some((day) => day.id === sessionDayId)
  ) {
    return sessionDayId;
  }
  return suggestedScheduledDay(input.activeDays, input.now)?.id ?? null;
}

export async function saveSessionToDay(
  supabase: SupabaseClient,
  input: {
    sessionId: string;
    programDayId: string | null | undefined;
    userId: string;
  },
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const programDayId = input.programDayId?.trim() || null;
  if (!programDayId || isSyntheticProgramDayId(programDayId)) {
    return { ok: true, inserted: 0 };
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, user_id")
    .eq("id", input.sessionId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }
  if (!session) {
    return { ok: false, error: "Session not found." };
  }

  const { data: day, error: dayError } = await supabase
    .from("workout_program_days")
    .select("id, program_id, source")
    .eq("id", programDayId)
    .maybeSingle();

  if (dayError) {
    return { ok: false, error: dayError.message };
  }
  if (!day || day.source === "paired") {
    return { ok: true, inserted: 0 };
  }

  const { data: program, error: programError } = await supabase
    .from("workout_programs")
    .select("id, user_id, primary_goal")
    .eq("id", day.program_id)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (programError) {
    return { ok: false, error: programError.message };
  }
  if (!program) {
    return { ok: true, inserted: 0 };
  }

  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("exercise_id, set_kind, reps, created_at")
    .eq("session_id", input.sessionId)
    .order("created_at", { ascending: true });

  if (setsError) {
    return { ok: false, error: setsError.message };
  }

  const logged = sessionExercisesFromSets((sets ?? []) as LoggedSetLike[]);
  if (logged.length === 0) {
    return { ok: true, inserted: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from("workout_program_exercises")
    .select("id, exercise_id, sort_order")
    .eq("day_id", programDayId)
    .order("sort_order", { ascending: true });

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  const rows = existing ?? [];
  const toInsert = exercisesToInsert(
    logged,
    rows.map((row) => row.exercise_id as string),
  );
  if (toInsert.length === 0) {
    return { ok: true, inserted: 0 };
  }

  const style = defaultStyleForProgramGoal(
    (program.primary_goal as PrimaryGoal | null) ?? null,
  );
  const defaults = defaultPrescriptionForStyle(style);
  const startOrder =
    rows.length === 0
      ? 0
      : Math.max(...rows.map((row) => Number(row.sort_order) || 0)) + 1;

  let inserted = 0;
  for (const [index, draft] of toInsert.entries()) {
    const repMin = draft.rep_min ?? defaults.rep_min;
    let repMax = draft.rep_max ?? draft.rep_min ?? defaults.rep_max;
    if (repMax < repMin) repMax = repMin;
    const { error: insertError } = await supabase
      .from("workout_program_exercises")
      .insert({
        day_id: programDayId,
        exercise_id: draft.exercise_id,
        sort_order: startOrder + index,
        sets: draft.sets,
        rep_min: repMin,
        rep_max: repMax,
        set_style: style,
        rest_sec: defaults.rest_sec,
        coach_notes: null,
      });
    if (!insertError) inserted += 1;
  }

  if (inserted > 0) {
    await markProgramDayCustomized(supabase, programDayId);
  }

  return { ok: true, inserted };
}
