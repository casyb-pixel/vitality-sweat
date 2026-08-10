import type { PrimaryGoal } from "@/lib/fitness/types";

/**
 * Default rest between sets when a program exercise has no rest_sec.
 * Strength gets longer recovery; metabolic / endurance goals stay shorter.
 */
export function defaultRestSecForGoal(
  goal: PrimaryGoal | null | undefined,
): number {
  switch (goal) {
    case "strength":
      return 180;
    case "muscle_gain":
      return 90;
    case "weight_loss":
    case "endurance":
    case "marathon_training":
      return 60;
    case "sports_training":
    case "general_fitness":
    default:
      return 90;
  }
}

export function resolveRestSec(input: {
  programRestSec?: number | null;
  goal?: PrimaryGoal | null;
}): number {
  const fromProgram = input.programRestSec;
  if (
    typeof fromProgram === "number" &&
    Number.isFinite(fromProgram) &&
    fromProgram > 0
  ) {
    return Math.min(600, Math.round(fromProgram));
  }
  return defaultRestSecForGoal(input.goal);
}
