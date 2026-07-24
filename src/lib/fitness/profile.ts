import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FitnessProfile,
  FitnessProfileInput,
} from "@/lib/fitness/types";

export async function getFitnessProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<FitnessProfile | null> {
  const { data, error } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[fitness] getFitnessProfile", error.message);
    return null;
  }

  return (data as FitnessProfile | null) ?? null;
}

export function isOnboardingComplete(
  profile: FitnessProfile | null | undefined,
): boolean {
  return Boolean(profile?.onboarding_completed_at);
}

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function ageFromBirthdate(birthdate: string): number | null {
  const date = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
  return age;
}

export function birthdateFromAge(age: number): string {
  const year = new Date().getFullYear() - Math.floor(age);
  return `${year}-01-01`;
}

export function validateFitnessProfileInput(
  body: unknown,
): { ok: true; data: FitnessProfileInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body." };
  }

  const row = body as Record<string, unknown>;
  const sex = row.sex;
  if (sex !== "male" && sex !== "female") {
    return { ok: false, error: "Sex must be male or female." };
  }

  const birthdate =
    typeof row.birthdate === "string" ? row.birthdate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return { ok: false, error: "Send a valid birthdate (YYYY-MM-DD)." };
  }

  const height_in = Number(row.height_in);
  const weight_lb = Number(row.weight_lb);
  if (!Number.isFinite(height_in) || height_in <= 0) {
    return { ok: false, error: "Height must be a positive number (inches)." };
  }
  if (!Number.isFinite(weight_lb) || weight_lb <= 0) {
    return { ok: false, error: "Weight must be a positive number (lb)." };
  }

  const waistRaw = row.waist_in;
  const waist_in =
    waistRaw === null || waistRaw === undefined || waistRaw === ""
      ? null
      : Number(waistRaw);
  if (waist_in != null && (!Number.isFinite(waist_in) || waist_in <= 0)) {
    return { ok: false, error: "Waist must be a positive number (inches)." };
  }

  const fitness_level = row.fitness_level;
  if (
    fitness_level !== "beginner" &&
    fitness_level !== "intermediate" &&
    fitness_level !== "advanced"
  ) {
    return { ok: false, error: "Select a fitness level." };
  }

  const primary_goal = row.primary_goal;
  const goals = new Set([
    "target_weight",
    "marathon_training",
    "sports_training",
    "general_fitness",
    "muscle_gain",
    "endurance",
  ]);
  if (typeof primary_goal !== "string" || !goals.has(primary_goal)) {
    return { ok: false, error: "Select a primary fitness goal." };
  }

  const targetRaw = row.target_weight_lb;
  const target_weight_lb =
    targetRaw === null || targetRaw === undefined || targetRaw === ""
      ? null
      : Number(targetRaw);
  if (
    target_weight_lb != null &&
    (!Number.isFinite(target_weight_lb) || target_weight_lb <= 0)
  ) {
    return { ok: false, error: "Target weight must be a positive number." };
  }

  return {
    ok: true,
    data: {
      sex,
      birthdate,
      unit_system: "imperial",
      height_in,
      weight_lb,
      waist_in,
      fitness_level,
      primary_goal: primary_goal as FitnessProfileInput["primary_goal"],
      target_weight_lb,
      goal_details:
        row.goal_details && typeof row.goal_details === "object"
          ? (row.goal_details as Record<string, unknown>)
          : {},
      disliked_foods: asStringArray(row.disliked_foods),
      food_allergies: asStringArray(row.food_allergies),
      health_conditions: asStringArray(row.health_conditions),
      activity_restrictions:
        typeof row.activity_restrictions === "string"
          ? row.activity_restrictions.trim() || null
          : null,
    },
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if (typeof value === "string") {
    return parseCommaList(value);
  }
  return [];
}
