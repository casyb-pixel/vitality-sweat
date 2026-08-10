import { NextResponse } from "next/server";
import {
  getFitnessProfile,
  validateFitnessProfileInput,
  validateTrainingPreferencesInput,
} from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const profile = await getFitnessProfile(supabase, user.id);
  return NextResponse.json({ ok: true, profile });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const validated = validateFitnessProfileInput(body);
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 },
      );
    }

    const { city, zip_code, region, ...fitnessFields } = validated.data;

    const payload = {
      id: user.id,
      ...fitnessFields,
      onboarding_completed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("fitness_profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      console.error("[api/app/fitness-profile]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const { error: geoError } = await supabase
      .from("profiles")
      .update({
        city,
        zip_code,
        region: region ?? null,
      })
      .eq("id", user.id);

    if (geoError) {
      console.error("[api/app/fitness-profile] geo", geoError.message);
      return NextResponse.json(
        { ok: false, error: geoError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Partial update for training preferences (and future settings). */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const validated = validateTrainingPreferencesInput(body);
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 },
      );
    }

    if (Object.keys(validated.data).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No training preference fields to update." },
        { status: 400 },
      );
    }

    const existing = await getFitnessProfile(supabase, user.id);
    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Complete onboarding before saving training preferences.",
        },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("fitness_profiles")
      .update(validated.data)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) {
      console.error("[api/app/fitness-profile] PATCH", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
