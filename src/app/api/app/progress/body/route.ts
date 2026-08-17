import { NextResponse } from "next/server";
import {
  MEASUREMENT_FIELDS,
  bmiFromImperial,
  parseOptionalInch,
  upsertBodyWeightLog,
  type BodyMeasurementLog,
  type BodyWeightLog,
  type MeasurementField,
} from "@/lib/fitness/body-logs";
import { getFitnessProfile } from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const REGULAR_SESSION_DAYS = 14;
const REGULAR_SESSION_MIN = 2;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const profile = await getFitnessProfile(supabase, user.id);
  const since = new Date();
  since.setDate(since.getDate() - REGULAR_SESSION_DAYS);

  const [{ data: weights }, { data: measurements }, { count }] = await Promise.all([
    supabase
      .from("body_weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_on", { ascending: true })
      .limit(90),
    supabase
      .from("body_measurement_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_on", { ascending: true })
      .limit(90),
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("started_at", since.toISOString()),
  ]);

  const heightIn = profile?.height_in ?? null;
  const weightRows = ((weights ?? []) as BodyWeightLog[]).map((row) => ({
    ...row,
    bmi:
      heightIn != null
        ? bmiFromImperial(Number(row.weight_lb), heightIn)
        : null,
  }));

  return NextResponse.json({
    ok: true,
    goal: profile?.primary_goal ?? null,
    unitSystem: profile?.unit_system ?? "imperial",
    heightIn,
    regularTraining: (count ?? 0) >= REGULAR_SESSION_MIN,
    completedSessionsLast14: count ?? 0,
    weights: weightRows,
    measurements: (measurements ?? []) as BodyMeasurementLog[],
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const kind = body.kind === "measurements" ? "measurements" : "weight";
    const recordedOn =
      typeof body.recorded_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.recorded_on)
        ? body.recorded_on
        : undefined;

    if (kind === "weight") {
      const weight = Number(body.weight_lb);
      const saved = await upsertBodyWeightLog(
        supabase,
        user.id,
        weight,
        recordedOn,
      );
      if (!saved.ok) {
        return NextResponse.json({ ok: false, error: saved.error }, { status: 400 });
      }
      const profile = await getFitnessProfile(supabase, user.id);
      return NextResponse.json({
        ok: true,
        weight: saved.log,
        bmi:
          profile?.height_in != null
            ? bmiFromImperial(saved.log.weight_lb, profile.height_in)
            : null,
      });
    }

    const patch: Record<string, number | null> = {};
    let hasField = false;
    for (const field of MEASUREMENT_FIELDS) {
      if (!(field in body)) continue;
      const parsed = parseOptionalInch(body[field as MeasurementField]);
      if (parsed === undefined && body[field] != null && body[field] !== "") {
        return NextResponse.json(
          { ok: false, error: `${field} must be a positive number.` },
          { status: 400 },
        );
      }
      if (parsed !== undefined) {
        patch[field] = parsed;
        hasField = true;
      }
    }
    if (!hasField) {
      return NextResponse.json(
        { ok: false, error: "Send at least one measurement." },
        { status: 400 },
      );
    }

    const onDate = recordedOn ?? new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("body_measurement_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("recorded_on", onDate)
      .maybeSingle();

    const { data, error } = await supabase
      .from("body_measurement_logs")
      .upsert(
        {
          ...(existing ?? {}),
          user_id: user.id,
          recorded_on: onDate,
          ...patch,
        },
        { onConflict: "user_id,recorded_on" },
      )
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not save measurements." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, measurement: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
