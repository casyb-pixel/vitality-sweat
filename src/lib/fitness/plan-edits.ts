import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultRepRangeForStyle,
  setStyleForGoal,
} from "@/lib/ai/workouts";
import type {
  ExerciseTrackingType,
  PrimaryGoal,
  WorkoutSetStyle,
} from "@/lib/fitness/types";

const SET_STYLES = new Set<string>([
  "strength_heavy",
  "hypertrophy",
  "endurance_light",
  "metabolic",
]);

export function isWorkoutSetStyle(value: unknown): value is WorkoutSetStyle {
  return typeof value === "string" && SET_STYLES.has(value);
}

/** Weight/reps prescriptions transfer; duration/distance need fresh defaults. */
export function trackingTypesCompatible(
  fromType: ExerciseTrackingType | string | null | undefined,
  toType: ExerciseTrackingType | string | null | undefined,
): boolean {
  const a = fromType ?? "weight_reps";
  const b = toType ?? "weight_reps";
  if (a === b) return true;
  const strengthLike = new Set(["weight_reps", "reps_only"]);
  return strengthLike.has(a) && strengthLike.has(b);
}

export function defaultRestSecForStyle(style: WorkoutSetStyle): number {
  switch (style) {
    case "strength_heavy":
      return 120;
    case "hypertrophy":
      return 90;
    case "metabolic":
      return 45;
    case "endurance_light":
      return 60;
  }
}

export function defaultPrescriptionForStyle(style: WorkoutSetStyle): {
  sets: number;
  rep_min: number;
  rep_max: number;
  rest_sec: number;
  set_style: WorkoutSetStyle;
} {
  const range = defaultRepRangeForStyle(style);
  return {
    sets: 3,
    rep_min: range.repMin,
    rep_max: range.repMax,
    rest_sec: defaultRestSecForStyle(style),
    set_style: style,
  };
}

export function defaultStyleForProgramGoal(
  goal: PrimaryGoal | null | undefined,
): WorkoutSetStyle {
  return setStyleForGoal(goal);
}

export async function markProgramDayCustomized(
  supabase: SupabaseClient,
  dayId: string,
): Promise<void> {
  await supabase
    .from("workout_program_days")
    .update({ customized_at: new Date().toISOString() })
    .eq("id", dayId);
}

export async function getOwnedProgramDay(
  supabase: SupabaseClient,
  dayId: string,
): Promise<{ id: string; program_id: string; customized_at: string | null } | null> {
  const { data } = await supabase
    .from("workout_program_days")
    .select("id, program_id, customized_at")
    .eq("id", dayId)
    .maybeSingle();
  return data;
}

export async function getOwnedProgramExercise(
  supabase: SupabaseClient,
  exerciseRowId: string,
): Promise<{
  id: string;
  day_id: string;
  exercise_id: string;
  sort_order: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  set_style: string;
  rest_sec: number | null;
  coach_notes: string | null;
} | null> {
  const { data } = await supabase
    .from("workout_program_exercises")
    .select(
      "id, day_id, exercise_id, sort_order, sets, rep_min, rep_max, set_style, rest_sec, coach_notes",
    )
    .eq("id", exerciseRowId)
    .maybeSingle();
  return data;
}
