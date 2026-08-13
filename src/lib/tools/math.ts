/**
 * Public fitness calculators. Estimates only, not medical advice.
 */

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "1-3 training days",
  moderate: "3-5 training days",
  active: "6-7 training days",
  very_active: "Two-a-days / physical job",
};

/** Mifflin-St Jeor BMR in kcal. Weight in kg, height in cm. */
export function mifflinBmrKcal(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

export function tdeeKcal(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTOR[activity]);
}

export function targetCalories(
  tdee: number,
  goal: "lose" | "maintain" | "gain",
): number {
  if (goal === "lose") return Math.max(1200, tdee - 400);
  if (goal === "gain") return tdee + 300;
  return tdee;
}

export function macrosFromCalories(input: {
  calories: number;
  weightKg: number;
  goal: "lose" | "maintain" | "gain";
}): { proteinG: number; fatG: number; carbsG: number } {
  const proteinPerKg = input.goal === "gain" ? 2.0 : 1.8;
  const proteinG = Math.round(proteinPerKg * input.weightKg);
  const fatG = Math.round((input.calories * 0.25) / 9);
  const carbsG = Math.max(
    0,
    Math.round((input.calories - proteinG * 4 - fatG * 9) / 4),
  );
  return { proteinG, fatG, carbsG };
}

export function bmiFromMetric(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function heartRateZones(age: number): {
  max: number;
  easy: [number, number];
  tempo: [number, number];
  interval: [number, number];
} {
  const max = Math.round(208 - 0.7 * age);
  return {
    max,
    easy: [Math.round(max * 0.6), Math.round(max * 0.7)],
    tempo: [Math.round(max * 0.7), Math.round(max * 0.8)],
    interval: [Math.round(max * 0.8), Math.round(max * 0.9)],
  };
}

export function runningPaceFromDistance(
  distanceMiles: number,
  minutes: number,
): { minPerMile: string; mph: number } {
  const pace = minutes / distanceMiles;
  const min = Math.floor(pace);
  const sec = Math.round((pace - min) * 60);
  return {
    minPerMile: `${min}:${sec.toString().padStart(2, "0")}`,
    mph: Math.round((distanceMiles / (minutes / 60)) * 10) / 10,
  };
}

export function creatineDoseG(weightKg: number): {
  daily: number;
  optionalLoad: number;
} {
  return {
    daily: Math.max(3, Math.round(weightKg * 0.03 * 10) / 10),
    optionalLoad: Math.round(weightKg * 0.3),
  };
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}
