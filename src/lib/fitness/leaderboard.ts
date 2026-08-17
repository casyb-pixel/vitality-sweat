import { estimatedOneRepMaxLb } from "@/lib/fitness/one-rep-max";
import { metersToMiles } from "@/lib/fitness/units";

export type LeaderboardClass = "strength" | "endurance" | "weight_loss";
export type LeaderboardMedal = "gold" | "silver" | "bronze";

export type LeaderboardEntry = {
  userId: string;
  username: string;
  displayName: string | null;
  exerciseId: string | null;
  exerciseName: string;
  score: number;
  medal: LeaderboardMedal;
  detail: string;
};

export type LeaderboardBoard = {
  class: LeaderboardClass;
  exerciseId: string | null;
  exerciseName: string;
  entries: LeaderboardEntry[];
};

const MIN_BODYWEIGHT_LB = 70;
const MAX_BODYWEIGHT_LB = 400;
const MAX_LIFT_LB = 2000;
const WEIGHT_LOSS_MIN_DAYS = 14;

export function strengthP4pScore(input: {
  weightLb: number;
  reps: number;
  bodyWeightLb: number;
}): number | null {
  const { weightLb, reps, bodyWeightLb } = input;
  if (bodyWeightLb < MIN_BODYWEIGHT_LB || bodyWeightLb > MAX_BODYWEIGHT_LB) {
    return null;
  }
  if (weightLb < 0 || weightLb > MAX_LIFT_LB) return null;
  if (reps <= 0) return null;
  const e1 = estimatedOneRepMaxLb(weightLb, reps);
  if (e1 == null || e1 <= 0) return null;
  return round4(e1 / bodyWeightLb);
}

export function relativeBodyweightScore(input: {
  extraWeightLb: number | null;
  bodyWeightLb: number;
}): number | null {
  const { extraWeightLb, bodyWeightLb } = input;
  if (bodyWeightLb < MIN_BODYWEIGHT_LB || bodyWeightLb > MAX_BODYWEIGHT_LB) {
    return null;
  }
  const extra = extraWeightLb != null && extraWeightLb > 0 ? extraWeightLb : 0;
  return round4((bodyWeightLb + extra) / bodyWeightLb);
}

export function enduranceScore(input: {
  distanceM: number | null;
  durationSec: number | null;
  inclinePct: number | null;
  elevationM: number | null;
  reps: number | null;
  trackingType: string;
}): number | null {
  const { distanceM, durationSec, inclinePct, elevationM, reps, trackingType } =
    input;
  if (trackingType === "duration") {
    return durationSec != null && durationSec > 0 ? durationSec : null;
  }
  if (distanceM == null || distanceM <= 0) return null;
  const incline = inclinePct != null && inclinePct > 0 ? inclinePct : 0;
  const elevation = elevationM != null && elevationM > 0 ? elevationM : 0;
  const strokeFactor = reps != null && reps > 0 ? 1 + reps / 500 : 1;
  return round4(distanceM * (1 + incline / 100) * strokeFactor + elevation);
}

export function formatStrengthDetail(input: {
  score: number;
  weightLb: number;
  reps: number;
}): string {
  return `${input.score.toFixed(2)}x BW · ${input.weightLb} lb x ${input.reps}`;
}

export function formatEnduranceDetail(input: {
  distanceM: number | null;
  durationSec: number | null;
  inclinePct: number | null;
  elevationM: number | null;
  reps: number | null;
}): string {
  const parts: string[] = [];
  if (input.distanceM != null && input.distanceM > 0) {
    const miles = metersToMiles(input.distanceM);
    parts.push(
      miles >= 0.1
        ? `${miles.toFixed(2)} mi (${Math.round(input.distanceM)} m)`
        : `${Math.round(input.distanceM)} m`,
    );
  }
  if (input.inclinePct != null && input.inclinePct > 0) {
    parts.push(`${input.inclinePct}% incline`);
  }
  if (input.elevationM != null && input.elevationM > 0) {
    parts.push(`${Math.round(input.elevationM)} m elevation`);
  }
  if (input.reps != null && input.reps > 0) {
    parts.push(`${input.reps} strokes`);
  }
  if (input.durationSec != null && input.durationSec > 0) {
    const min = Math.floor(input.durationSec / 60);
    const sec = input.durationSec % 60;
    parts.push(`${min}:${String(sec).padStart(2, "0")}`);
  }
  return parts.join(" · ") || "logged set";
}

export function formatWeightLossDetail(input: {
  percent: number;
  lostLb: number;
}): string {
  return `${input.percent.toFixed(1)}% · ${input.lostLb.toFixed(1)} lb lost`;
}

export function weightLossEligible(input: {
  startOn: string;
  currentOn: string;
  startLb: number;
  currentLb: number;
}): { percent: number; lostLb: number } | null {
  const start = Date.parse(`${input.startOn}T00:00:00Z`);
  const current = Date.parse(`${input.currentOn}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(current)) return null;
  const days = (current - start) / (1000 * 60 * 60 * 24);
  if (days < WEIGHT_LOSS_MIN_DAYS) return null;
  if (input.startLb <= 0 || input.currentLb <= 0) return null;
  const lostLb = input.startLb - input.currentLb;
  if (lostLb <= 0) return null;
  return {
    percent: round4((lostLb / input.startLb) * 100),
    lostLb: round4(lostLb),
  };
}

export function medalsFor(ranked: Array<Omit<LeaderboardEntry, "medal">>): LeaderboardEntry[] {
  const medals: LeaderboardMedal[] = ["gold", "silver", "bronze"];
  return ranked.slice(0, 3).map((row, index) => ({
    ...row,
    medal: medals[index]!,
  }));
}

export const CROSSOVER_ENDURANCE_SLUGS = [
  "treadmill-run",
  "outdoor-run",
  "rowing-machine",
] as const;

export const CROSSOVER_STRENGTH_NAMES = [
  "Barbell Deadlift",
  "Back Squat",
  "Barbell Bench Press",
  "Conventional Deadlift",
  "Squat",
];

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
