import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Exercise,
  WorkoutProgram,
  WorkoutProgramDay,
  WorkoutProgramExercise,
} from "@/lib/fitness/types";

export type NestedProgram = WorkoutProgram & {
  days: Array<
    WorkoutProgramDay & {
      exercises: Array<
        WorkoutProgramExercise & {
          exercise?: Exercise | null;
        }
      >;
    }
  >;
};

export const NESTED_PROGRAM_SELECT = `
  *,
  days:workout_program_days (
    *,
    exercises:workout_program_exercises (
      *,
      exercise:exercises (
        id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, youtube_url, cues, how_to
      )
    )
  )
`;

export function sortNestedProgram(program: NestedProgram): NestedProgram {
  const days = [...(program.days ?? [])]
    .sort((a, b) => {
      const aBonus = (a.day_kind ?? "scheduled") === "bonus";
      const bBonus = (b.day_kind ?? "scheduled") === "bonus";
      if (aBonus !== bBonus) return aBonus ? 1 : -1;
      if (!aBonus && !bBonus) {
        return (a.day_index ?? 0) - (b.day_index ?? 0);
      }
      return String(b.scheduled_date ?? "").localeCompare(
        String(a.scheduled_date ?? ""),
      );
    })
    .map((day) => ({
      ...day,
      exercises: [...(day.exercises ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }));
  return { ...program, days };
}

export async function fetchNestedProgramById(
  supabase: SupabaseClient,
  programId: string,
): Promise<NestedProgram | null> {
  const { data, error } = await supabase
    .from("workout_programs")
    .select(NESTED_PROGRAM_SELECT)
    .eq("id", programId)
    .maybeSingle();
  if (error || !data) return null;
  return sortNestedProgram(data as NestedProgram);
}

export async function fetchActiveNestedProgram(
  supabase: SupabaseClient,
  userId: string,
): Promise<NestedProgram | null> {
  const { data, error } = await supabase
    .from("workout_programs")
    .select(NESTED_PROGRAM_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return sortNestedProgram(data as NestedProgram);
}

export async function archiveActivePrograms(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("workout_programs")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getOwnedProgramForUser(
  supabase: SupabaseClient,
  programId: string,
  userId: string,
): Promise<{ id: string; user_id: string; days_per_week: number | null } | null> {
  const { data } = await supabase
    .from("workout_programs")
    .select("id, user_id, days_per_week")
    .eq("id", programId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
