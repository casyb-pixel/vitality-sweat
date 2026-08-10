import { NextResponse } from "next/server";
import {
  getOwnedProgramDay,
  markProgramDayCustomized,
} from "@/lib/fitness/plan-edits";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ dayId: string }> };

/** Reorder exercises on a program day. Body: { ordered_ids: string[] } */
export async function PATCH(request: Request, context: RouteContext) {
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

    let body: { ordered_ids?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const orderedIds = Array.isArray(body.ordered_ids)
      ? body.ordered_ids
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    if (orderedIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Send ordered_ids." },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("workout_program_exercises")
      .select("id")
      .eq("day_id", dayId);

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "ordered_ids must include every exercise on this day exactly once.",
        },
        { status: 400 },
      );
    }

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("workout_program_exercises")
        .update({ sort_order: i })
        .eq("id", orderedIds[i]!)
        .eq("day_id", dayId);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    await markProgramDayCustomized(supabase, dayId);

    const { data: rows } = await supabase
      .from("workout_program_exercises")
      .select(
        `
        id, day_id, exercise_id, sort_order, sets, rep_min, rep_max, set_style,
        rest_sec, coach_notes, baseline_weight_lb, baseline_reps, last_prescription, created_at,
        exercise:exercises ( id, name, category, primary_muscle, equipment, tracking_type )
      `,
      )
      .eq("day_id", dayId)
      .order("sort_order", { ascending: true });

    const { data: dayRow } = await supabase
      .from("workout_program_days")
      .select("id, customized_at")
      .eq("id", dayId)
      .single();

    return NextResponse.json({
      ok: true,
      exercises: rows ?? [],
      day_customized_at: dayRow?.customized_at ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
