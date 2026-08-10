import type { SupabaseClient } from "@supabase/supabase-js";

/** US ZIP: 12345 or 12345-6789 */
export const US_ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

export type MemberProfile = {
  id: string;
  email: string | null;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  zip_code: string | null;
  region: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberGeoInput = {
  city: string;
  zip_code: string;
  region?: string | null;
};

export function normalizeUsZip(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function isValidUsZip(value: string | null | undefined): boolean {
  if (!value) return false;
  return US_ZIP_PATTERN.test(normalizeUsZip(value));
}

export function hasRequiredGeo(
  profile: Pick<MemberProfile, "city" | "zip_code"> | null | undefined,
): boolean {
  const city = profile?.city?.trim() ?? "";
  return Boolean(city) && isValidUsZip(profile?.zip_code);
}

export function validateMemberGeoInput(
  body: unknown,
): { ok: true; data: MemberGeoInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body." };
  }

  const row = body as Record<string, unknown>;
  const city = typeof row.city === "string" ? row.city.trim() : "";
  if (!city) {
    return { ok: false, error: "City is required." };
  }
  if (city.length > 80) {
    return { ok: false, error: "City must be 80 characters or fewer." };
  }

  const zipRaw =
    typeof row.zip_code === "string"
      ? row.zip_code
      : typeof row.zip === "string"
        ? row.zip
        : "";
  const zip_code = normalizeUsZip(zipRaw);
  if (!isValidUsZip(zip_code)) {
    return {
      ok: false,
      error: "Enter a valid US ZIP code (12345 or 12345-6789).",
    };
  }

  const regionRaw =
    typeof row.region === "string"
      ? row.region
      : typeof row.parish === "string"
        ? row.parish
        : "";
  const region = regionRaw.trim() || null;
  if (region && region.length > 80) {
    return {
      ok: false,
      error: "Parish / region must be 80 characters or fewer.",
    };
  }

  return { ok: true, data: { city, zip_code, region } };
}

export async function getMemberProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<MemberProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, role, display_name, avatar_url, city, zip_code, region, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] getMemberProfile", error.message);
    return null;
  }

  return (data as MemberProfile | null) ?? null;
}

/**
 * Where to send a signed-in member before full app use.
 * Fitness onboarding first; then geo-only completion on /profile.
 */
export async function getMemberCompletionRedirect(
  supabase: SupabaseClient,
  userId: string,
  opts?: { fitnessOnboardingComplete?: boolean },
): Promise<string | null> {
  let fitnessDone = opts?.fitnessOnboardingComplete;

  if (fitnessDone === undefined) {
    const { data, error } = await supabase
      .from("fitness_profiles")
      .select("onboarding_completed_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[auth] fitness onboarding check", error.message);
    }
    fitnessDone = Boolean(data?.onboarding_completed_at);
  }

  if (!fitnessDone) {
    return "/app/onboarding";
  }

  const profile = await getMemberProfile(supabase, userId);
  if (!hasRequiredGeo(profile)) {
    return "/profile?complete=geo";
  }

  return null;
}
