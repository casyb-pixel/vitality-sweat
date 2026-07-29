import type {
  Exercise,
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseTrackingType,
} from "@/lib/fitness/types";

export const EXERCISE_EQUIPMENT_OPTIONS: {
  value: ExerciseEquipment;
  label: string;
}[] = [
  { value: "free_weight", label: "Free weight" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Body weight" },
];

export const EXERCISE_CATEGORY_OPTIONS: {
  value: ExerciseCategory;
  label: string;
}[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "endurance", label: "Endurance" },
];

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function exerciseMatchesQuery(
  exercise: Exercise,
  query: string,
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const haystack = normalizeSearchText(
    [exercise.name, ...(exercise.aliases ?? [])].join(" "),
  );
  if (haystack.includes(q)) return true;
  // Token match: every query word appears somewhere.
  return q.split(" ").every((token) => haystack.includes(token));
}

export function filterExercises(
  exercises: Exercise[],
  opts: {
    query?: string;
    equipment?: ExerciseEquipment | "";
    category?: ExerciseCategory | "";
  },
): Exercise[] {
  return exercises.filter((ex) => {
    if (opts.equipment && ex.equipment !== opts.equipment) return false;
    if (opts.category && ex.category !== opts.category) return false;
    if (opts.query && !exerciseMatchesQuery(ex, opts.query)) return false;
    return true;
  });
}

/** Exact / alias match before calling Gemini. */
export function findLocalExerciseMatch(
  exercises: Exercise[],
  query: string,
): Exercise | null {
  const q = normalizeSearchText(query);
  if (!q) return null;

  for (const ex of exercises) {
    const names = [ex.name, ...(ex.aliases ?? [])].map(normalizeSearchText);
    if (names.includes(q)) return ex;
  }

  // Soft match: query equals name without spaces/hyphens (pullup vs pull-up).
  const compact = q.replace(/\s+/g, "");
  for (const ex of exercises) {
    const names = [ex.name, ...(ex.aliases ?? [])].map((n) =>
      normalizeSearchText(n).replace(/\s+/g, ""),
    );
    if (names.includes(compact)) return ex;
  }

  return null;
}

export function isExerciseEquipment(
  value: unknown,
): value is ExerciseEquipment {
  return (
    value === "machine" || value === "bodyweight" || value === "free_weight"
  );
}

export function isExerciseCategory(value: unknown): value is ExerciseCategory {
  return value === "cardio" || value === "strength" || value === "endurance";
}

export function isTrackingType(value: unknown): value is ExerciseTrackingType {
  return (
    value === "weight_reps" ||
    value === "reps_only" ||
    value === "duration" ||
    value === "distance"
  );
}

export type CatalogExerciseSummary = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  equipment: string;
};
