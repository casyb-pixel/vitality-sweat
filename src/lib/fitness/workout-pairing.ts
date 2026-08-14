import type { NestedProgramDay } from "@/components/app/WorkoutAgent";
import { absoluteUrl } from "@/lib/seo/site";
import type { WorkoutSetStyle } from "@/lib/fitness/types";

export type PairedExerciseSnapshot = {
  id: string;
  exercise_id: string;
  name: string;
  sort_order: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  set_style: WorkoutSetStyle | string;
  rest_sec: number | null;
  coach_notes: string | null;
  superset_group: string | null;
};

export type PairedDaySnapshot = {
  label: string;
  focus: string | null;
  notes: string | null;
  estimated_minutes: number | null;
  exercises: PairedExerciseSnapshot[];
};

export function snapshotProgramDay(day: NestedProgramDay): PairedDaySnapshot {
  return {
    label: day.label,
    focus: day.focus,
    notes: day.notes,
    estimated_minutes: day.estimated_minutes,
    exercises: [...(day.exercises ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((ex) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
        name: ex.exercise?.name ?? "Exercise",
        sort_order: ex.sort_order,
        sets: ex.sets,
        rep_min: ex.rep_min,
        rep_max: ex.rep_max,
        set_style: ex.set_style,
        rest_sec: ex.rest_sec,
        coach_notes: ex.coach_notes,
        superset_group: ex.superset_group ?? null,
      })),
  };
}

export function syntheticDayFromSnapshot(
  inviteId: string,
  snapshot: PairedDaySnapshot,
): NestedProgramDay {
  const now = new Date().toISOString();
  return {
    id: `paired-${inviteId}`,
    program_id: "",
    day_index: null,
    label: snapshot.label || "Paired workout",
    focus: snapshot.focus,
    estimated_minutes: snapshot.estimated_minutes,
    notes: snapshot.notes,
    day_kind: "bonus",
    scheduled_date: now.slice(0, 10),
    source: "paired",
    customized_at: null,
    created_at: now,
    updated_at: now,
    exercises: (snapshot.exercises ?? []).map((ex, index) => ({
      id: `paired-ex-${inviteId}-${index}`,
      day_id: `paired-${inviteId}`,
      exercise_id: ex.exercise_id,
      sort_order: ex.sort_order ?? index,
      sets: ex.sets,
      rep_min: ex.rep_min,
      rep_max: ex.rep_max,
      set_style: (ex.set_style as WorkoutSetStyle) ?? "hypertrophy",
      rest_sec: ex.rest_sec,
      coach_notes: ex.coach_notes,
      baseline_weight_lb: null,
      baseline_reps: null,
      superset_group: ex.superset_group,
      created_at: now,
      exercise: {
        id: ex.exercise_id,
        name: ex.name,
        category: "strength",
        primary_muscle: "",
        equipment: "",
      },
    })),
  };
}

export function pairJoinPath(token: string): string {
  return `/app/workout/join/${encodeURIComponent(token)}`;
}

export function pairJoinUrl(token: string): string {
  return absoluteUrl(pairJoinPath(token));
}

export function randomInviteToken(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
