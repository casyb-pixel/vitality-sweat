import { NextResponse } from "next/server";
import {
  defaultPrescriptionForStyle,
  getOwnedProgramExercise,
  isWorkoutSetStyle,
  markProgramDayCustomized,
  trackingTypesCompatible,
} from "@/lib/fitness/plan-edits";
import type { Exercise, WorkoutSetStyle } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const EXERCISE_SELECT = `
  id, day_id, exercise_id, sort_order, sets, rep_min, rep_max, set_style,
  rest_sec, coach_notes, baseline_weight_lb, baseline_reps, last_prescription, created_at,
  exercise:exercises ( id, name, category, primary_muscle, equipment, tracking_type )
`;

/** Update or swap a planned exercise row. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const existing = await getOwnedProgramExercise(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Exercise not found." },
        { status: 404 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if ("exercise_id" in body) {
      const nextExerciseId =
        typeof body.exercise_id === "string" ? body.exercise_id.trim() : "";
      if (!nextExerciseId) {
        return NextResponse.json(
          { ok: false, error: "exercise_id is required when swapping." },
          { status: 400 },
        );
      }

      const { data: currentEx } = await supabase
        .from("exercises")
        .select("id, tracking_type")
        .eq("id", existing.exercise_id)
        .maybeSingle();
      const { data: nextEx } = await supabase
        .from("exercises")
        .select("id, tracking_type, name")
        .eq("id", nextExerciseId)
        .eq("is_active", true)
        .maybeSingle();

      if (!nextEx) {
        return NextResponse.json(
          { ok: false, error: "Replacement exercise not found." },
          { status: 404 },
        );
      }

      patch.exercise_id = nextExerciseId;
      patch.baseline_weight_lb = null;
      patch.baseline_reps = null;
      patch.last_prescription = null;

      const compatible = trackingTypesCompatible(
        (currentEx as Exercise | null)?.tracking_type,
        (nextEx as Exercise).tracking_type,
      );
      if (!compatible) {
        const style = isWorkoutSetStyle(existing.set_style)
          ? existing.set_style
          : "hypertrophy";
        const defaults = defaultPrescriptionForStyle(style as WorkoutSetStyle);
        patch.sets = defaults.sets;
        patch.rep_min = defaults.rep_min;
        patch.rep_max = defaults.rep_max;
        patch.rest_sec = defaults.rest_sec;
        patch.set_style = defaults.set_style;
      }
    }

    if ("sets" in body) {
      const sets = Number(body.sets);
      if (!Number.isInteger(sets) || sets < 1 || sets > 12) {
        return NextResponse.json(
          { ok: false, error: "sets must be an integer from 1 to 12." },
          { status: 400 },
        );
      }
      patch.sets = sets;
    }

    if ("rep_min" in body) {
      if (body.rep_min === null || body.rep_min === "") {
        patch.rep_min = null;
      } else {
        const n = Number(body.rep_min);
        if (!Number.isInteger(n) || n < 1) {
          return NextResponse.json(
            { ok: false, error: "rep_min must be a positive integer or null." },
            { status: 400 },
          );
        }
        patch.rep_min = n;
      }
    }

    if ("rep_max" in body) {
      if (body.rep_max === null || body.rep_max === "") {
        patch.rep_max = null;
      } else {
        const n = Number(body.rep_max);
        if (!Number.isInteger(n) || n < 1) {
          return NextResponse.json(
            { ok: false, error: "rep_max must be a positive integer or null." },
            { status: 400 },
          );
        }
        patch.rep_max = n;
      }
    }

    if ("rest_sec" in body) {
      if (body.rest_sec === null || body.rest_sec === "") {
        patch.rest_sec = null;
      } else {
        const n = Number(body.rest_sec);
        if (!Number.isInteger(n) || n < 0 || n > 600) {
          return NextResponse.json(
            { ok: false, error: "rest_sec must be 0-600 or null." },
            { status: 400 },
          );
        }
        patch.rest_sec = n;
      }
    }

    if ("set_style" in body) {
      if (!isWorkoutSetStyle(body.set_style)) {
        return NextResponse.json(
          { ok: false, error: "Invalid set_style." },
          { status: 400 },
        );
      }
      patch.set_style = body.set_style;
    }

    if ("coach_notes" in body) {
      if (body.coach_notes === null) {
        patch.coach_notes = null;
      } else if (typeof body.coach_notes === "string") {
        patch.coach_notes = body.coach_notes.trim().slice(0, 500) || null;
      } else {
        return NextResponse.json(
          { ok: false, error: "coach_notes must be a string or null." },
          { status: 400 },
        );
      }
    }

    const nextRepMin =
      "rep_min" in patch ? (patch.rep_min as number | null) : existing.rep_min;
    const nextRepMax =
      "rep_max" in patch ? (patch.rep_max as number | null) : existing.rep_max;
    if (
      nextRepMin != null &&
      nextRepMax != null &&
      nextRepMax < nextRepMin
    ) {
      return NextResponse.json(
        { ok: false, error: "rep_max must be >= rep_min." },
        { status: 400 },
      );
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("workout_program_exercises")
      .update(patch)
      .eq("id", id)
      .select(EXERCISE_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await markProgramDayCustomized(supabase, existing.day_id);

    const { data: day } = await supabase
      .from("workout_program_days")
      .select("id, customized_at")
      .eq("id", existing.day_id)
      .single();

    return NextResponse.json({
      ok: true,
      exercise: data,
      day_customized_at: day?.customized_at ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Remove a planned exercise from a day. */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const existing = await getOwnedProgramExercise(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Exercise not found." },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("workout_program_exercises")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await markProgramDayCustomized(supabase, existing.day_id);

    const { data: remaining } = await supabase
      .from("workout_program_exercises")
      .select("id")
      .eq("day_id", existing.day_id)
      .order("sort_order", { ascending: true });

    if (remaining?.length) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from("workout_program_exercises")
          .update({ sort_order: i })
          .eq("id", remaining[i]!.id);
      }
    }

    const { data: day } = await supabase
      .from("workout_program_days")
      .select("id, customized_at")
      .eq("id", existing.day_id)
      .single();

    return NextResponse.json({
      ok: true,
      deleted_id: id,
      day_customized_at: day?.customized_at ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
