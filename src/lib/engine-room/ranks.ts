import {
  relativeBodyweightScore,
  strengthP4pScore,
} from "@/lib/fitness/leaderboard";

export type RankBand = "bronze" | "silver" | "gold";

export type RankableSet = {
  weightLb: number | null;
  reps: number | null;
  setKind?: string | null;
};

export type RankableExercise = {
  id: string;
  name: string;
  trackingType: string | null;
  category: string | null;
  equipment: string | null;
};

export type PersonalLiftRank = {
  exerciseId: string;
  exerciseName: string;
  score: number;
  band: RankBand | null;
  detail: string;
  kind: "loaded" | "bodyweight";
};

export const P4P_CUTOFFS = {
  bronze: 0.5,
  silver: 0.75,
  gold: 1,
} as const;

export const REPS_CUTOFFS = {
  bronze: 8,
  silver: 15,
  gold: 25,
} as const;

export const RANK_BAND_LABEL: Record<RankBand, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

export function bandFromP4p(score: number): RankBand | null {
  if (!Number.isFinite(score) || score <= 0) return null;
  if (score >= P4P_CUTOFFS.gold) return "gold";
  if (score >= P4P_CUTOFFS.silver) return "silver";
  if (score >= P4P_CUTOFFS.bronze) return "bronze";
  return null;
}

export function bandFromReps(reps: number): RankBand | null {
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (reps >= REPS_CUTOFFS.gold) return "gold";
  if (reps >= REPS_CUTOFFS.silver) return "silver";
  if (reps >= REPS_CUTOFFS.bronze) return "bronze";
  return null;
}

export function isRankableExercise(exercise: RankableExercise): boolean {
  const category = (exercise.category ?? "").toLowerCase();
  const tracking = (exercise.trackingType ?? "").toLowerCase();
  if (category === "cardio" || category === "endurance") return false;
  if (tracking === "duration" || tracking === "distance") return false;
  return tracking === "weight_reps" || tracking === "reps_only";
}

function isWorkingSet(set: RankableSet): boolean {
  const kind = (set.setKind ?? "working").toLowerCase();
  return kind !== "warmup";
}

function bestLoadedSet(sets: RankableSet[]): RankableSet | null {
  let best: RankableSet | null = null;
  let bestScore = 0;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    if (set.weightLb == null || set.weightLb <= 0) continue;
    if (set.reps == null || set.reps <= 0) continue;
    const score = set.weightLb * (1 + set.reps / 30);
    if (score > bestScore) {
      best = set;
      bestScore = score;
    }
  }
  return best;
}

function bestRepsSet(sets: RankableSet[]): RankableSet | null {
  let best: RankableSet | null = null;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    if (set.reps == null || set.reps <= 0) continue;
    if (!best || (set.reps ?? 0) > (best.reps ?? 0)) best = set;
  }
  return best;
}

export function rankLoadedLift(input: {
  exercise: RankableExercise;
  sets: RankableSet[];
  bodyWeightLb: number;
}): PersonalLiftRank | null {
  const best = bestLoadedSet(input.sets);
  if (!best || best.weightLb == null || best.reps == null) return null;
  const score = strengthP4pScore({
    weightLb: best.weightLb,
    reps: best.reps,
    bodyWeightLb: input.bodyWeightLb,
  });
  if (score == null) return null;
  return {
    exerciseId: input.exercise.id,
    exerciseName: input.exercise.name,
    score,
    band: bandFromP4p(score),
    detail: `${score.toFixed(2)}x BW · ${best.weightLb} lb x ${best.reps}`,
    kind: "loaded",
  };
}

export function rankBodyweightLift(input: {
  exercise: RankableExercise;
  sets: RankableSet[];
  bodyWeightLb: number | null;
}): PersonalLiftRank | null {
  const best = bestRepsSet(input.sets);
  if (!best || best.reps == null) return null;
  const extra =
    best.weightLb != null && best.weightLb > 0 ? best.weightLb : 0;
  let effectiveReps = best.reps;
  if (extra > 0 && input.bodyWeightLb != null && input.bodyWeightLb > 0) {
    const relative = relativeBodyweightScore({
      extraWeightLb: extra,
      bodyWeightLb: input.bodyWeightLb,
    });
    if (relative != null) effectiveReps = best.reps * relative;
  }
  const band = bandFromReps(effectiveReps);
  const extraBit =
    extra > 0 ? ` + ${extra} lb` : "";
  return {
    exerciseId: input.exercise.id,
    exerciseName: input.exercise.name,
    score: Math.round(effectiveReps * 10000) / 10000,
    band,
    detail: `${best.reps} reps${extraBit}`,
    kind: "bodyweight",
  };
}

export function rankExercise(input: {
  exercise: RankableExercise;
  sets: RankableSet[];
  bodyWeightLb: number | null;
}): PersonalLiftRank | null {
  if (!isRankableExercise(input.exercise)) return null;
  const tracking = (input.exercise.trackingType ?? "").toLowerCase();
  const equipment = (input.exercise.equipment ?? "").toLowerCase();
  if (tracking === "reps_only" || equipment === "bodyweight") {
    return rankBodyweightLift(input);
  }
  if (input.bodyWeightLb == null) return null;
  return rankLoadedLift({
    exercise: input.exercise,
    sets: input.sets,
    bodyWeightLb: input.bodyWeightLb,
  });
}

export function rankSessionExercises(input: {
  exercises: Array<{
    exercise: RankableExercise;
    sets: RankableSet[];
  }>;
  bodyWeightLb: number | null;
}): PersonalLiftRank[] {
  const ranks: PersonalLiftRank[] = [];
  for (const row of input.exercises) {
    const rank = rankExercise({
      exercise: row.exercise,
      sets: row.sets,
      bodyWeightLb: input.bodyWeightLb,
    });
    if (rank) ranks.push(rank);
  }
  return ranks;
}
