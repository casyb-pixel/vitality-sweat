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

export function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
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
  if (q.split(" ").every((token) => haystack.includes(token))) return true;
  // Compact match: "benchpress" ↔ "Barbell Bench Press"
  const compactQ = compactSearchText(q);
  if (compactQ.length < 3) return false;
  const compactNames = [exercise.name, ...(exercise.aliases ?? [])].map(
    compactSearchText,
  );
  return compactNames.some(
    (name) =>
      name.includes(compactQ) ||
      (compactQ.length >= 5 && compactQ.includes(name) && name.length >= 5),
  );
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

export type RankedExerciseMatch = {
  exercise: Exercise;
  score: number;
};

/**
 * Rank catalog exercises for a free-text query.
 * High scores (≥90) are exact/alias; mid scores are fuzzy family matches
 * (e.g. "benchpress" → Barbell + Dumbbell Bench Press).
 */
export function rankLocalExerciseMatches(
  exercises: Exercise[],
  query: string,
): RankedExerciseMatch[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const compactQ = compactSearchText(q);
  const tokens = q.split(" ").filter(Boolean);

  const ranked: RankedExerciseMatch[] = [];

  for (const ex of exercises) {
    const names = [ex.name, ...(ex.aliases ?? [])].map(normalizeSearchText);
    const compactNames = names.map((n) => n.replace(/\s+/g, ""));
    let score = 0;

    if (names.includes(q)) {
      score = 100;
    } else if (compactNames.includes(compactQ)) {
      score = 95;
    } else if (
      compactQ.length >= 4 &&
      compactNames.some((n) => n.includes(compactQ))
    ) {
      // "benchpress" inside "barbellbenchpress" / "dumbbellbenchpress"
      score = 82;
    } else if (
      compactQ.length >= 6 &&
      compactNames.some((n) => n.length >= 5 && compactQ.includes(n))
    ) {
      score = 78;
    } else if (tokens.length && tokens.every((t) => names.some((n) => n.includes(t)))) {
      score = tokens.length === 1 ? 70 : 75;
    } else if (
      compactQ.length >= 4 &&
      compactNames.some((n) => {
        // Shared stem for short typos / missing vowels
        const shorter = compactQ.length <= n.length ? compactQ : n;
        const longer = compactQ.length <= n.length ? n : compactQ;
        return longer.includes(shorter) && shorter.length >= Math.min(5, longer.length - 2);
      })
    ) {
      score = 65;
    }

    if (score > 0) ranked.push({ exercise: ex, score });
  }

  return ranked.sort(
    (a, b) =>
      b.score - a.score || a.exercise.name.localeCompare(b.exercise.name),
  );
}

/** Exact / alias match before calling Gemini. */
export function findLocalExerciseMatch(
  exercises: Exercise[],
  query: string,
): Exercise | null {
  const ranked = rankLocalExerciseMatches(exercises, query);
  const top = ranked[0];
  if (!top) return null;

  // Spaced exact name/alias — safe to auto-select.
  if (top.score >= 100) return top.exercise;

  // Compact-only hit (benchpress ↔ "bench press" alias): only auto-pick
  // when nothing else in the family is a close peer.
  if (top.score >= 95) {
    const peers = ranked.filter((r) => r.score >= 80);
    if (peers.length === 1) return top.exercise;
    return null;
  }

  return null;
}

/**
 * When several library exercises fit equally well (Barbell vs Dumbbell Bench),
 * return them for the member to choose instead of auto-picking one.
 */
export function findAmbiguousLocalMatches(
  exercises: Exercise[],
  query: string,
  limit = 6,
): Exercise[] {
  const ranked = rankLocalExerciseMatches(exercises, query);
  if (ranked.length < 2) return [];

  const top = ranked[0]!;
  if (top.score < 70) return [];
  // True exact match already handled by findLocalExerciseMatch.
  if (top.score >= 100) return [];

  // Compact alias hits (95) still need peers like Dumbbell Bench (82).
  const floor = top.score >= 95 ? 80 : Math.max(70, top.score - 8);
  const peers = ranked.filter((r) => r.score >= floor);
  if (peers.length < 2) return [];
  return peers.slice(0, limit).map((r) => r.exercise);
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
