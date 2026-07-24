import type { ProgressionSuggestion } from "@/lib/fitness/types";

type PastSet = {
  weight_lb: number | null;
  reps: number | null;
  difficulty: number;
  set_number: number;
};

/**
 * Deterministic progressive-overload suggestion from the most recent
 * completed sets for an exercise.
 *
 * - avg difficulty <= 2 (easy) → ~10% more weight, rounded to nearest 5 lb
 * - difficulty == 3 → hold weight, +1 rep target
 * - difficulty == 4 → hold weight
 * - difficulty == 5 → deload ~10%, rounded to nearest 5 lb
 */
export function suggestProgression(
  exerciseId: string,
  sets: PastSet[],
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

  const lastWeightLb = weights.length
    ? Math.max(...weights)
    : null;
  const lastReps = reps.length
    ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length)
    : null;
  const lastSets = sets.length;
  const roundedAvg = Math.round(avgDifficulty * 10) / 10;

  let suggestedWeightLb: number | null = lastWeightLb;
  let suggestedReps: number | null = lastReps;
  let message: string;

  if (avgDifficulty <= 2) {
    if (lastWeightLb != null && lastWeightLb > 0) {
      suggestedWeightLb = roundToNearest5(lastWeightLb * 1.1);
      // Guarantee at least a 5 lb bump when current weight is already a multiple of 5.
      if (suggestedWeightLb <= lastWeightLb) {
        suggestedWeightLb = lastWeightLb + 5;
      }
      message = `Last time felt easy — try ${formatWeight(suggestedWeightLb)} next (${lastSets}×${lastReps ?? "?"} at ${formatWeight(lastWeightLb)}).`;
    } else {
      suggestedReps = lastReps != null ? lastReps + 2 : null;
      message =
        "Last time felt easy — add a couple of reps or increase the load.";
    }
  } else if (avgDifficulty < 3.5) {
    suggestedReps = lastReps != null ? lastReps + 1 : null;
    message =
      lastWeightLb != null
        ? `Solid effort — hold ${formatWeight(lastWeightLb)} and aim for ${(suggestedReps ?? lastReps ?? 0)} reps.`
        : "Solid effort — try one more rep than last time.";
  } else if (avgDifficulty < 4.5) {
    message =
      lastWeightLb != null
        ? `That was hard — keep ${formatWeight(lastWeightLb)} and nail the same reps.`
        : "That was hard — repeat the same target and focus on form.";
  } else {
    if (lastWeightLb != null && lastWeightLb > 0) {
      suggestedWeightLb = Math.max(5, roundToNearest5(lastWeightLb * 0.9));
      if (suggestedWeightLb >= lastWeightLb && lastWeightLb > 5) {
        suggestedWeightLb = lastWeightLb - 5;
      }
      message = `Very hard last time — deload to ${formatWeight(suggestedWeightLb)} and rebuild.`;
    } else {
      suggestedReps = lastReps != null ? Math.max(1, lastReps - 2) : null;
      message = "Very hard last time — reduce volume a bit and rebuild.";
    }
  }

  return {
    exercise_id: exerciseId,
    lastWeightLb,
    lastReps,
    lastSets,
    lastAvgDifficulty: roundedAvg,
    suggestedWeightLb,
    suggestedReps,
    message,
  };
}

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

function formatWeight(lb: number): string {
  return Number.isInteger(lb) ? `${lb} lb` : `${lb.toFixed(1)} lb`;
}
