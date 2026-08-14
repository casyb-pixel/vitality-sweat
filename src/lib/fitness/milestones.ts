import {
  GOALS_REQUIRING_TARGET_WEIGHT,
  type PrimaryGoal,
} from "@/lib/fitness/types";

export type MilestoneType =
  | "personal_best"
  | "goal_weight"
  | "streak"
  | "program_week"
  | "custom";

export type MilestoneStats = {
  weight_lb?: number | null;
  reps?: number | null;
  volume?: number | null;
  prior_best_weight_lb?: number | null;
  prior_best_volume?: number | null;
  current_weight_lb?: number | null;
  previous_weight_lb?: number | null;
  target_weight_lb?: number | null;
};

export type WorkoutMilestone = {
  type: MilestoneType;
  title: string;
  detail: string;
  exercise_id?: string;
  stats: MilestoneStats;
};

export type PriorSetSample = {
  weight_lb: number | null;
  reps: number | null;
};

function volumeOf(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null) return null;
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight < 0 || reps < 0) return null;
  return weight * reps;
}

function bestWeight(sets: PriorSetSample[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.weight_lb == null || !Number.isFinite(s.weight_lb)) continue;
    if (best == null || s.weight_lb > best) best = s.weight_lb;
  }
  return best;
}

function bestVolume(sets: PriorSetSample[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const v = volumeOf(s.weight_lb, s.reps);
    if (v == null) continue;
    if (best == null || v > best) best = v;
  }
  return best;
}

/**
 * Detect a personal best vs prior sets for the same exercise.
 * Compares top weight_lb and weight×reps volume. Needs at least one prior set.
 */
export function detectPersonalBest(input: {
  exerciseId: string;
  exerciseName?: string | null;
  weightLb: number | null;
  reps: number | null;
  priorSets: PriorSetSample[];
}): WorkoutMilestone | null {
  const { weightLb, reps, priorSets, exerciseId } = input;
  if (priorSets.length === 0) return null;
  if (weightLb == null || !Number.isFinite(weightLb) || weightLb <= 0) {
    return null;
  }

  const priorBestWeight = bestWeight(priorSets);
  const priorBestVol = bestVolume(priorSets);
  const currentVol = volumeOf(weightLb, reps);

  const weightPr =
    priorBestWeight != null && weightLb > priorBestWeight;
  const volumePr =
    currentVol != null &&
    priorBestVol != null &&
    currentVol > priorBestVol;

  if (!weightPr && !volumePr) return null;

  const name = (input.exerciseName ?? "this lift").trim() || "this lift";
  const repsPart =
    reps != null && Number.isFinite(reps) ? ` × ${reps}` : "";

  if (weightPr) {
    return {
      type: "personal_best",
      title: `New PR on ${name}`,
      detail: `${weightLb} lb${repsPart} beats your prior best of ${priorBestWeight} lb.`,
      exercise_id: exerciseId,
      stats: {
        weight_lb: weightLb,
        reps,
        volume: currentVol,
        prior_best_weight_lb: priorBestWeight,
        prior_best_volume: priorBestVol,
      },
    };
  }

  return {
    type: "personal_best",
    title: `New volume PR on ${name}`,
    detail: `${weightLb} lb${repsPart} is a new best total load for this exercise.`,
    exercise_id: exerciseId,
    stats: {
      weight_lb: weightLb,
      reps,
      volume: currentVol,
      prior_best_weight_lb: priorBestWeight,
      prior_best_volume: priorBestVol,
    },
  };
}

/**
 * Detect crossing target_weight_lb on a weigh-in when the goal cares about it.
 */
export function detectGoalWeight(input: {
  previousWeightLb: number | null;
  currentWeightLb: number;
  targetWeightLb: number | null;
  primaryGoal: PrimaryGoal | null;
}): WorkoutMilestone | null {
  const {
    previousWeightLb: prev,
    currentWeightLb: current,
    targetWeightLb: target,
    primaryGoal: goal,
  } = input;

  if (target == null || !Number.isFinite(target) || target <= 0) return null;
  if (!Number.isFinite(current) || current <= 0) return null;
  if (goal == null || !GOALS_REQUIRING_TARGET_WEIGHT.has(goal)) return null;
  if (prev == null || !Number.isFinite(prev)) return null;

  if (goal === "weight_loss") {
    if (!(prev > target && current <= target)) return null;
    return {
      type: "goal_weight",
      title: "Goal weight reached",
      detail: `You hit ${current} lb, at or under your ${target} lb target.`,
      stats: {
        current_weight_lb: current,
        previous_weight_lb: prev,
        target_weight_lb: target,
      },
    };
  }

  if (goal === "muscle_gain") {
    if (!(prev < target && current >= target)) return null;
    return {
      type: "goal_weight",
      title: "Goal weight reached",
      detail: `You hit ${current} lb, at or above your ${target} lb target.`,
      stats: {
        current_weight_lb: current,
        previous_weight_lb: prev,
        target_weight_lb: target,
      },
    };
  }

  return null;
}

export function milestoneChipPrompt(milestone: WorkoutMilestone): string {
  if (milestone.type === "personal_best") {
    return `${milestone.title}. Share it?`;
  }
  return `${milestone.title}. Share the win?`;
}
