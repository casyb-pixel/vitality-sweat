import { NextResponse } from "next/server";
import {
  defaultPrescriptionForStyle,
  defaultStyleForProgramGoal,
  getOwnedProgramDay,
  isWorkoutSetStyle,
  markProgramDayCustomized,
} from "@/lib/fitness/plan-edits";
import type { PrimaryGoal, WorkoutSetStyle } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ dayId: string }> };

const EXERCISE_SELECT = `
  id, day_id, exercise_id, sort_order, sets, rep_min, rep_max, set_style,
  rest_sec, coach_notes, baseline_weight_lb, baseline_reps, last_prescription, created_at,
  exercise:exercises ( id, name, category, primary_muscle, equipment, tracking_type )
`;

/** Add an exercise to a program day (append or insert after a row). */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { dayId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const day = await getOwnedProgramDay(supabase, dayId);
    if (!day) {
      return NextResponse.json({ ok: false, error: "Day not found." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const exerciseId =
      typeof body.exercise_id === "string" ? body.exercise_id.trim() : "";
    if (!exerciseId) {
      return NextResponse.json(
        { ok: false, error: "Send exercise_id." },
        { status: 400 },
      );
    }

    const { data: catalogEx } = await supabase
      .from("exercises")
      .select("id, name, tracking_type")
      .eq("id", exerciseId)
      .eq("is_active", true)
      .maybeSingle();

    if (!catalogEx) {
      return NextResponse.json(
        { ok: false, error: "Exercise not found in catalog." },
        { status: 404 },
      );
    }

    const { data: program } = await supabase
      .from("workout_programs")
      .select("primary_goal")
      .eq("id", day.program_id)
      .maybeSingle();

    const style: WorkoutSetStyle = isWorkoutSetStyle(body.set_style)
      ? body.set_style
      : defaultStyleForProgramGoal(
          (program?.primary_goal as PrimaryGoal | null) ?? null,
        );
    const defaults = defaultPrescriptionForStyle(style);

    let sets = defaults.sets;
    if ("sets" in body) {
      const n = Number(body.sets);
      if (!Number.isInteger(n) || n < 1 || n > 12) {
        return NextResponse.json(
          { ok: false, error: "sets must be 1-12." },
          { status: 400 },
        );
      }
      sets = n;
    }

    let repMin = defaults.rep_min;
    let repMax = defaults.rep_max;
    if ("rep_min" in body && body.rep_min != null && body.rep_min !== "") {
      const n = Number(body.rep_min);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json(
          { ok: false, error: "rep_min must be a positive integer." },
          { status: 400 },
        );
      }
      repMin = n;
    }
    if ("rep_max" in body && body.rep_max != null && body.rep_max !== "") {
      const n = Number(body.rep_max);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json(
          { ok: false, error: "rep_max must be a positive integer." },
          { status: 400 },
        );
      }
      repMax = n;
    }
    if (repMax < repMin) {
      return NextResponse.json(
        { ok: false, error: "rep_max must be >= rep_min." },
        { status: 400 },
      );
    }

    let restSec = defaults.rest_sec;
    if ("rest_sec" in body && body.rest_sec != null && body.rest_sec !== "") {
      const n = Number(body.rest_sec);
      if (!Number.isInteger(n) || n < 0 || n > 600) {
        return NextResponse.json(
          { ok: false, error: "rest_sec must be 0-600." },
          { status: 400 },
        );
      }
      restSec = n;
    }

    const coachNotes =
      typeof body.coach_notes === "string"
        ? body.coach_notes.trim().slice(0, 500) || null
        : null;

    const { data: existing } = await supabase
      .from("workout_program_exercises")
      .select("id, sort_order")
      .eq("day_id", dayId)
      .order("sort_order", { ascending: true });

    const rows = existing ?? [];
    const afterId =
      typeof body.after_id === "string" ? body.after_id.trim() : "";
    let insertAt = rows.length;
    if (afterId) {
      const idx = rows.findIndex((r) => r.id === afterId);
      if (idx >= 0) insertAt = idx + 1;
    }

    // Shift sort_order for rows at/after insert point.
    for (let i = rows.length - 1; i >= insertAt; i--) {
      await supabase
        .from("workout_program_exercises")
        .update({ sort_order: i + 1 })
        .eq("id", rows[i]!.id);
    }

    const { data, error } = await supabase
      .from("workout_program_exercises")
      .insert({
        day_id: dayId,
        exercise_id: exerciseId,
        sort_order: insertAt,
        sets,
        rep_min: repMin,
        rep_max: repMax,
        set_style: style,
        rest_sec: restSec,
        coach_notes: coachNotes,
      })
      .select(EXERCISE_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await markProgramDayCustomized(supabase, dayId);

    const { data: dayRow } = await supabase
      .from("workout_program_days")
      .select("id, customized_at")
      .eq("id", dayId)
      .single();

    return NextResponse.json({
      ok: true,
      exercise: data,
      day_customized_at: dayRow?.customized_at ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
