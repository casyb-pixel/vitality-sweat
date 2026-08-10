import type { SupabaseClient } from "@supabase/supabase-js";
import { validateMemberGeoInput } from "@/lib/auth/member-profile";
import type {
  FitnessProfile,
  FitnessProfileInput,
  PreferredSplit,
  PrimaryGoal,
  TrainingPreferences,
  TrainingPreferencesInput,
} from "@/lib/fitness/types";
import {
  GOALS_REQUIRING_TARGET_WEIGHT,
  TRAINING_EQUIPMENT_OPTIONS,
} from "@/lib/fitness/types";

const PREFERRED_SPLITS = new Set<string>([
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "ai_choose",
]);

const EQUIPMENT_SET = new Set<string>(TRAINING_EQUIPMENT_OPTIONS);

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

export function trainingPreferencesFromProfile(
  profile: FitnessProfile,
): TrainingPreferences {
  return {
    days_per_week: profile.days_per_week ?? null,
    session_minutes: profile.session_minutes ?? null,
    equipment: profile.equipment ?? [],
    focus_muscles: profile.focus_muscles ?? [],
    avoidances: profile.avoidances ?? null,
    preferred_split: profile.preferred_split ?? null,
  };
}

/**
 * Validates optional training-preference fields.
 * Missing keys are omitted from the result (partial PATCH-friendly).
 * Explicit null clears nullable scalars; arrays default to [] when provided empty.
 */
export function validateTrainingPreferencesInput(
  body: unknown,
):
  | { ok: true; data: TrainingPreferencesInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body." };
  }

  const row = body as Record<string, unknown>;
  const data: TrainingPreferencesInput = {};

  if ("days_per_week" in row) {
    const raw = row.days_per_week;
    if (raw === null || raw === "") {
      data.days_per_week = null;
    } else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 7) {
        return {
          ok: false,
          error: "Days per week must be an integer from 1 to 7.",
        };
      }
      data.days_per_week = n;
    }
  }

  if ("session_minutes" in row) {
    const raw = row.session_minutes;
    if (raw === null || raw === "") {
      data.session_minutes = null;
    } else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 5 || n > 180) {
        return {
          ok: false,
          error: "Session minutes must be an integer from 5 to 180.",
        };
      }
      data.session_minutes = n;
    }
  }

  if ("equipment" in row) {
    const list = asStringArray(row.equipment);
    for (const item of list) {
      if (!EQUIPMENT_SET.has(item)) {
        return {
          ok: false,
          error: `Unknown equipment "${item}". Use: ${TRAINING_EQUIPMENT_OPTIONS.join(", ")}.`,
        };
      }
    }
    data.equipment = list;
  }

  if ("focus_muscles" in row) {
    data.focus_muscles = asStringArray(row.focus_muscles).slice(0, 20);
  }

  if ("avoidances" in row) {
    const raw = row.avoidances;
    if (raw === null || raw === undefined) {
      data.avoidances = null;
    } else if (typeof raw === "string") {
      data.avoidances = raw.trim() || null;
    } else {
      return { ok: false, error: "Avoidances must be a string." };
    }
  }

  if ("preferred_split" in row) {
    const raw = row.preferred_split;
    if (raw === null || raw === "") {
      data.preferred_split = null;
    } else if (typeof raw === "string" && PREFERRED_SPLITS.has(raw)) {
      data.preferred_split = raw as PreferredSplit;
    } else {
      return {
        ok: false,
        error:
          "Preferred split must be full_body, upper_lower, push_pull_legs, or ai_choose.",
      };
    }
  }

  return { ok: true, data };
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
  const goals = new Set<string>([
    "weight_loss",
    "muscle_gain",
    "strength",
    "endurance",
    "general_fitness",
    "sports_training",
    "marathon_training",
  ]);
  if (typeof primary_goal !== "string" || !goals.has(primary_goal)) {
    return { ok: false, error: "Select a primary fitness goal." };
  }
  const goal = primary_goal as PrimaryGoal;

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
  if (GOALS_REQUIRING_TARGET_WEIGHT.has(goal) && target_weight_lb == null) {
    return {
      ok: false,
      error: "Enter a target weight for weight loss or muscle gain goals.",
    };
  }

  const training = validateTrainingPreferencesInput(row);
  if (!training.ok) {
    return training;
  }

  const geo = validateMemberGeoInput(row);
  if (!geo.ok) {
    return geo;
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
      primary_goal: goal,
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
      ...training.data,
      city: geo.data.city,
      zip_code: geo.data.zip_code,
      region: geo.data.region ?? null,
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
