import type { SupabaseClient } from "@supabase/supabase-js";
import { bmiFromMetric } from "@/lib/tools/math";
import { inchesToCm, lbToKg } from "@/lib/fitness/units";

export type BodyWeightLog = {
  id: string;
  user_id: string;
  recorded_on: string;
  weight_lb: number;
  created_at: string;
  updated_at: string;
};

export type BodyMeasurementLog = {
  id: string;
  user_id: string;
  recorded_on: string;
  neck_in: number | null;
  shoulders_in: number | null;
  chest_in: number | null;
  bicep_in: number | null;
  waist_in: number | null;
  hip_in: number | null;
  thigh_in: number | null;
  calf_in: number | null;
  created_at: string;
  updated_at: string;
};

export const MEASUREMENT_FIELDS = [
  "neck_in",
  "shoulders_in",
  "chest_in",
  "bicep_in",
  "waist_in",
  "hip_in",
  "thigh_in",
  "calf_in",
] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

export const MEASUREMENT_LABELS: Record<MeasurementField, string> = {
  neck_in: "Neck",
  shoulders_in: "Shoulders",
  chest_in: "Chest",
  bicep_in: "Biceps",
  waist_in: "Waist",
  hip_in: "Hips",
  thigh_in: "Thighs",
  calf_in: "Calves",
};

export function bmiFromImperial(
  weightLb: number,
  heightIn: number,
): number | null {
  if (!Number.isFinite(weightLb) || !Number.isFinite(heightIn)) return null;
  if (weightLb <= 0 || heightIn <= 0) return null;
  return bmiFromMetric(lbToKg(weightLb), inchesToCm(heightIn));
}

export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function upsertBodyWeightLog(
  supabase: SupabaseClient,
  userId: string,
  weightLb: number,
  recordedOn = utcDateString(),
): Promise<{ ok: true; log: BodyWeightLog } | { ok: false; error: string }> {
  if (!Number.isFinite(weightLb) || weightLb <= 0 || weightLb >= 1000) {
    return { ok: false, error: "Weight must be a positive number under 1000 lb." };
  }

  const { data, error } = await supabase
    .from("body_weight_logs")
    .upsert(
      {
        user_id: userId,
        recorded_on: recordedOn,
        weight_lb: weightLb,
      },
      { onConflict: "user_id,recorded_on" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save weigh-in." };
  }

  await supabase
    .from("fitness_profiles")
    .update({ weight_lb: weightLb })
    .eq("id", userId);

  return { ok: true, log: data as BodyWeightLog };
}

export async function latestBodyWeightLb(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("body_weight_logs")
    .select("weight_lb")
    .eq("user_id", userId)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  const value = data?.weight_lb != null ? Number(data.weight_lb) : null;
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function parseOptionalInch(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}
