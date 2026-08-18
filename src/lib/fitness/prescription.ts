import type {
  ProgressionSuggestion,
  WorkoutSetStyle,
} from "@/lib/fitness/types";
import { WORKOUT_SET_STYLE_LABELS } from "@/lib/fitness/types";
import { suggestProgression } from "@/lib/fitness/progression";

export type LastPrescription = {
  weight_lb: number | null;
  reps: number | null;
  sets?: number | null;
  set_style: WorkoutSetStyle | string;
  message: string;
  source: "progression" | "baseline" | "plan" | "cache" | "hold_stale";
  updated_at: string;
};

export type ExercisePrescription = {
  targetWeightLb: number | null;
  targetReps: number | null;
  targetSets: number | null;
  source: "progression" | "baseline" | "plan" | "cache" | "hold_stale";
  message: string;
  suggestion: ProgressionSuggestion | null;
};

type PastSet = {
  weight_lb: number | null;
  reps: number | null;
  difficulty: number;
  set_number: number;
};

function formatWeight(lb: number): string {
  return Number.isInteger(lb) ? `${lb} lb` : `${lb.toFixed(1)} lb`;
}

function formatSetsReps(sets: number | null, reps: number | null): string {
  if (sets != null && reps != null) return `${sets}×${reps}`;
  if (reps != null) return `${reps} reps`;
  if (sets != null) return `${sets} sets`;
  return "the prescribed work";
}

function styleSchemeLabel(setStyle: WorkoutSetStyle | string): string {
  if (setStyle in WORKOUT_SET_STYLE_LABELS) {
    return WORKOUT_SET_STYLE_LABELS[setStyle as WorkoutSetStyle].toLowerCase();
  }
  return "training";
}

function difficultyPhrase(avg: number): string {
  if (avg <= 2) return "felt easy";
  if (avg < 3.5) return "felt solid";
  if (avg < 4.5) return "felt hard";
  return "felt very hard";
}

function midRepTarget(repMin: number | null, repMax: number | null): number | null {
  if (repMin != null && repMax != null) {
    return Math.round((repMin + repMax) / 2);
  }
  return repMin ?? repMax;
}

/**
 * Merge deterministic progression math with program-day context.
 * Load numbers always come from suggestProgression or baselines - never invented.
 */
export function buildExercisePrescription(input: {
  exerciseId: string;
  exerciseName: string;
  setStyle: WorkoutSetStyle | string;
  baselineWeightLb: number | null;
  baselineReps: number | null;
  repMin: number | null;
  repMax: number | null;
  recentSets: PastSet[];
  lastPrescription?: LastPrescription | null;
  /** ISO timestamp of last session that logged this exercise. */
  lastSessionAt?: string | null;
  now?: Date;
  /** Bodyweight / reps-only moves skip load and coach from sets and reps. */
  repsBased?: boolean;
  plannedSets?: number | null;
}): ExercisePrescription {
  const suggestion = suggestProgression(input.exerciseId, input.recentSets, {
    lastSessionAt: input.lastSessionAt,
    now: input.now,
  });
  const scheme = styleSchemeLabel(input.setStyle);
  const name = input.exerciseName.trim() || "This lift";
  const repsBased = Boolean(input.repsBased);
  const plannedSets = input.plannedSets ?? null;

  if (suggestion) {
    const weight = repsBased
      ? null
      : (suggestion.suggestedWeightLb ??
        suggestion.lastWeightLb ??
        input.baselineWeightLb);
    const reps =
      suggestion.suggestedReps ??
      suggestion.lastReps ??
      input.baselineReps ??
      midRepTarget(input.repMin, input.repMax);
    const sets =
      suggestion.suggestedSets ?? suggestion.lastSets ?? plannedSets;

    if (suggestion.heldForMissedWeek) {
      return {
        targetWeightLb: weight,
        targetReps: reps,
        targetSets: sets,
        source: "hold_stale",
        message: repsBased
          ? `${suggestion.message} Keep the ${scheme} scheme.`
          : `${suggestion.message} Keep the ${scheme} scheme.`,
        suggestion,
      };
    }

    let message: string;
    if (repsBased) {
      message = `Last ${name.toLowerCase()} ${difficultyPhrase(suggestion.lastAvgDifficulty)} at ${formatSetsReps(suggestion.lastSets, suggestion.lastReps)} - today use ${formatSetsReps(sets, reps)} on the ${scheme} scheme.`;
    } else if (
      suggestion.lastWeightLb != null &&
      suggestion.lastReps != null &&
      suggestion.suggestedWeightLb != null
    ) {
      message = `Last ${name.toLowerCase()} ${difficultyPhrase(suggestion.lastAvgDifficulty)} at ${formatWeight(suggestion.lastWeightLb)}×${suggestion.lastReps} - today use ${formatWeight(suggestion.suggestedWeightLb)}${reps != null ? ` × ${reps}` : ""} for the same ${scheme} scheme.`;
    } else if (suggestion.suggestedWeightLb != null) {
      message = `${suggestion.message.replace(/\u2014/g, "-").replace(/\u2013/g, "-")} Keep the ${scheme} scheme.`;
    } else {
      message = `${suggestion.message.replace(/\u2014/g, "-").replace(/\u2013/g, "-")} Stay on the ${scheme} scheme.`;
    }

    return {
      targetWeightLb: weight,
      targetReps: reps,
      targetSets: sets,
      source: "progression",
      message,
      suggestion,
    };
  }

  if (input.baselineWeightLb != null || input.baselineReps != null) {
    const reps =
      input.baselineReps ?? midRepTarget(input.repMin, input.repMax);
    const weight = repsBased ? null : input.baselineWeightLb;
    const sets = plannedSets;
    const message = repsBased
      ? `No recent sets yet. Start from your baseline: ${formatSetsReps(sets, reps)} on the ${scheme} scheme.`
      : weight != null && reps != null
        ? `No recent sets yet. Start from your baseline: ${formatWeight(weight)} × ${reps} on the ${scheme} scheme.`
        : weight != null
          ? `No recent sets yet. Start from your baseline: ${formatWeight(weight)} on the ${scheme} scheme.`
          : `No recent sets yet. Aim for about ${reps} reps on the ${scheme} scheme.`;

    return {
      targetWeightLb: weight,
      targetReps: reps,
      targetSets: sets,
      source: "baseline",
      message,
      suggestion: null,
    };
  }

  if (input.lastPrescription) {
    return {
      targetWeightLb: repsBased ? null : input.lastPrescription.weight_lb,
      targetReps: input.lastPrescription.reps,
      targetSets: input.lastPrescription.sets ?? plannedSets,
      source: "cache",
      message:
        input.lastPrescription.message ||
        `Use your last prescription for the ${scheme} scheme.`,
      suggestion: null,
    };
  }

  const planReps = midRepTarget(input.repMin, input.repMax);
  return {
    targetWeightLb: null,
    targetReps: planReps,
    targetSets: plannedSets,
    source: "plan",
    message: repsBased
      ? planReps != null
        ? `No history yet. Hit about ${formatSetsReps(plannedSets, planReps)} on the ${scheme} scheme and log how it felt.`
        : `No history yet. Follow the ${scheme} scheme and log how the reps felt.`
      : planReps != null
        ? `No history yet. Hit about ${planReps} reps on the ${scheme} scheme and log how it felt.`
        : `No history yet. Follow the ${scheme} scheme and log how it felt.`,
    suggestion: null,
  };
}

export function prescriptionToSnapshot(
  prescription: ExercisePrescription,
  setStyle: WorkoutSetStyle | string,
): LastPrescription {
  return {
    weight_lb: prescription.targetWeightLb,
    reps: prescription.targetReps,
    sets: prescription.targetSets,
    set_style: setStyle,
    message: prescription.message,
    source: prescription.source,
    updated_at: new Date().toISOString(),
  };
}
