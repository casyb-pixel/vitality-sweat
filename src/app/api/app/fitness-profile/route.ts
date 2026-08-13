import { NextResponse } from "next/server";
import { detectGoalWeight } from "@/lib/fitness/milestones";
import {
  getFitnessProfile,
  validateFitnessProfileInput,
  validateTrainingPreferencesInput,
} from "@/lib/fitness/profile";
import type { PrimaryGoal } from "@/lib/fitness/types";
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

/** Partial update for training preferences and weigh-ins. */
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

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const existing = await getFitnessProfile(supabase, user.id);
    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Complete onboarding before updating your fitness profile.",
        },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = {};

    if ("weight_lb" in body) {
      const weight = Number(body.weight_lb);
      if (!Number.isFinite(weight) || weight <= 0) {
        return NextResponse.json(
          { ok: false, error: "weight_lb must be a positive number." },
          { status: 400 },
        );
      }
      patch.weight_lb = weight;
    }

    if ("unit_system" in body) {
      const units = body.unit_system;
      if (units !== "imperial" && units !== "metric") {
        return NextResponse.json(
          { ok: false, error: "unit_system must be imperial or metric." },
          { status: 400 },
        );
      }
      patch.unit_system = units;
    }

    if ("default_rest_sec" in body) {
      if (body.default_rest_sec === null || body.default_rest_sec === "") {
        patch.default_rest_sec = null;
      } else {
        const rest = Number(body.default_rest_sec);
        if (!Number.isInteger(rest) || rest < 15 || rest > 600) {
          return NextResponse.json(
            { ok: false, error: "Rest must be 15-600 seconds." },
            { status: 400 },
          );
        }
        patch.default_rest_sec = rest;
      }
    }

    if ("notifications_opt_in" in body) {
      patch.notifications_opt_in = Boolean(body.notifications_opt_in);
    }

    const prefsValidated = validateTrainingPreferencesInput(body);
    if (!prefsValidated.ok) {
      return NextResponse.json(
        { ok: false, error: prefsValidated.error },
        { status: 400 },
      );
    }
    Object.assign(patch, prefsValidated.data);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No profile fields to update." },
        { status: 400 },
      );
    }

    const previousWeight = existing.weight_lb;

    const { data, error } = await supabase
      .from("fitness_profiles")
      .update(patch)
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

    let milestone = null;
    if (typeof patch.weight_lb === "number") {
      milestone = detectGoalWeight({
        previousWeightLb: previousWeight,
        currentWeightLb: patch.weight_lb,
        targetWeightLb: existing.target_weight_lb,
        primaryGoal: existing.primary_goal as PrimaryGoal | null,
      });
    }

    return NextResponse.json({ ok: true, profile: data, milestone });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
