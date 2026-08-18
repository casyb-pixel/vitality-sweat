import type { ProgressionSuggestion } from "@/lib/fitness/types";

type PastSet = {
  weight_lb: number | null;
  reps: number | null;
  difficulty: number;
  set_number: number;
};

/** Hold loads when the last session for this exercise is older than this. */
export const MISSED_WEEK_HOLD_DAYS = 10;

export type SuggestProgressionOptions = {
  /** ISO timestamp of the most recent session that included this exercise. */
  lastSessionAt?: string | Date | null;
  now?: Date;
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function hasLoad(weight: number | null): weight is number {
  return weight != null && Number.isFinite(weight) && weight > 0;
}

function formatSetsReps(sets: number | null, reps: number | null): string {
  if (sets != null && reps != null) return `${sets}×${reps}`;
  if (reps != null) return `${reps} reps`;
  if (sets != null) return `${sets} sets`;
  return "your last target";
}

/**
 * Deterministic progressive-overload suggestion from the most recent
 * completed sets for an exercise.
 *
 * Loaded lifts:
 * - avg difficulty <= 2 (easy) → ~10% more weight, rounded to nearest 5 lb
 * - difficulty == 3 → hold weight, +1 rep target
 * - difficulty == 4 → hold weight
 * - difficulty == 5 → deload ~10%, rounded to nearest 5 lb
 *
 * Bodyweight / reps-only:
 * - easy → +2 reps (or +1 set if reps are already high)
 * - solid → +1 rep
 * - hard → hold
 * - very hard → -2 reps
 *
 * - last session > 10 days ago → hold targets (missed-week guard)
 */
export function suggestProgression(
  exerciseId: string,
  sets: PastSet[],
  opts?: SuggestProgressionOptions,
): ProgressionSuggestion | null {
  if (!sets.length) return null;

  const avgDifficulty =
    sets.reduce((sum, s) => sum + s.difficulty, 0) / sets.length;

  const weights = sets
    .map((s) => s.weight_lb)
    .filter((w): w is number => typeof w === "number" && w >= 0);
  const reps = sets
    .map((s) => s.reps)
    .filter((r): r is number => typeof r === "number" && r >= 0);

  const lastWeightLb = weights.length ? Math.max(...weights) : null;
  const lastReps = reps.length
    ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length)
    : null;
  const lastSets = sets.length;
  const roundedAvg = Math.round(avgDifficulty * 10) / 10;
  const loaded = hasLoad(lastWeightLb);

  const now = opts?.now ?? new Date();
  const lastAtRaw = opts?.lastSessionAt;
  const lastAt =
    lastAtRaw == null
      ? null
      : lastAtRaw instanceof Date
        ? lastAtRaw
        : new Date(lastAtRaw);
  const stale =
    lastAt != null &&
    Number.isFinite(lastAt.getTime()) &&
    daysBetween(lastAt, now) > MISSED_WEEK_HOLD_DAYS;

  if (stale) {
    return {
      exercise_id: exerciseId,
      lastWeightLb,
      lastReps,
      lastSets,
      lastAvgDifficulty: roundedAvg,
      suggestedWeightLb: loaded ? lastWeightLb : null,
      suggestedReps: lastReps,
      suggestedSets: lastSets,
      message: loaded
        ? `Over ${MISSED_WEEK_HOLD_DAYS} days since your last session - hold ${formatWeight(lastWeightLb)} and rebuild consistency before advancing.`
        : `Over ${MISSED_WEEK_HOLD_DAYS} days since your last session - hold ${formatSetsReps(lastSets, lastReps)} and rebuild consistency before advancing.`,
      heldForMissedWeek: true,
    };
  }

  let suggestedWeightLb: number | null = loaded ? lastWeightLb : null;
  let suggestedReps: number | null = lastReps;
  let suggestedSets: number | null = lastSets;
  let message: string;

  if (avgDifficulty <= 2) {
    if (loaded) {
      suggestedWeightLb = roundToNearest5(lastWeightLb * 1.1);
      if (suggestedWeightLb <= lastWeightLb) {
        suggestedWeightLb = lastWeightLb + 5;
      }
      message = `Last time felt easy - try ${formatWeight(suggestedWeightLb)} next (${lastSets}×${lastReps ?? "?"} at ${formatWeight(lastWeightLb)}).`;
    } else if (lastReps != null && lastReps >= 15 && lastSets < 6) {
      suggestedSets = lastSets + 1;
      message = `Last time ${formatSetsReps(lastSets, lastReps)} felt easy - add a set and try ${formatSetsReps(suggestedSets, lastReps)} today.`;
    } else {
      suggestedReps = lastReps != null ? lastReps + 2 : null;
      message = `Last time ${formatSetsReps(lastSets, lastReps)} felt easy - today try ${formatSetsReps(suggestedSets, suggestedReps)}.`;
    }
  } else if (avgDifficulty < 3.5) {
    suggestedReps = lastReps != null ? lastReps + 1 : null;
    message = loaded
      ? `Solid effort - hold ${formatWeight(lastWeightLb)} and aim for ${(suggestedReps ?? lastReps ?? 0)} reps.`
      : `Solid effort - last time was ${formatSetsReps(lastSets, lastReps)}. Aim for ${formatSetsReps(suggestedSets, suggestedReps)} today.`;
  } else if (avgDifficulty < 4.5) {
    message = loaded
      ? `That was hard - keep ${formatWeight(lastWeightLb)} and nail the same reps.`
      : `That was hard - repeat ${formatSetsReps(lastSets, lastReps)} and focus on clean reps.`;
  } else if (loaded) {
    suggestedWeightLb = Math.max(5, roundToNearest5(lastWeightLb * 0.9));
    if (suggestedWeightLb >= lastWeightLb && lastWeightLb > 5) {
      suggestedWeightLb = lastWeightLb - 5;
    }
    message = `Very hard last time - deload to ${formatWeight(suggestedWeightLb)} and rebuild.`;
  } else {
    suggestedReps = lastReps != null ? Math.max(1, lastReps - 2) : null;
    message = `Very hard last time - drop to ${formatSetsReps(suggestedSets, suggestedReps)} and rebuild.`;
  }

  return {
    exercise_id: exerciseId,
    lastWeightLb,
    lastReps,
    lastSets,
    lastAvgDifficulty: roundedAvg,
    suggestedWeightLb,
    suggestedReps,
    suggestedSets,
    message,
    heldForMissedWeek: false,
  };
}

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

function formatWeight(lb: number): string {
  return Number.isInteger(lb) ? `${lb} lb` : `${lb.toFixed(1)} lb`;
}
