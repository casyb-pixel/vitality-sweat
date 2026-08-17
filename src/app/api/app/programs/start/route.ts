import { NextResponse } from "next/server";
import { resolveExerciseForProgram } from "@/lib/fitness/resolve-exercise";
import { getNamedProgram } from "@/lib/fitness/program-templates";
import type { Exercise } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const program = getNamedProgram(slug);
  if (!program) {
    return NextResponse.json({ ok: false, error: "Unknown program." }, { status: 404 });
  }

  await supabase
    .from("workout_programs")
    .update({ status: "archived" })
    .eq("user_id", user.id)
    .eq("status", "active");

  const { data: created, error: createError } = await supabase
    .from("workout_programs")
    .insert({
      user_id: user.id,
      status: "active",
      primary_goal: "general_fitness",
      days_per_week: program.daysPerWeek,
      session_minutes: program.sessionMinutes,
      summary: program.summary,
      origin: "template",
    })
    .select("*")
    .single();
  if (createError || !created) {
    return NextResponse.json(
      { ok: false, error: createError?.message ?? "Could not start program." },
      { status: 500 },
    );
  }

  const { data: catalog } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .limit(800);
  const cache = new Map<string, Exercise>();

  for (const [index, day] of program.days.entries()) {
    const { data: dayRow, error: dayError } = await supabase
      .from("workout_program_days")
      .insert({
        program_id: created.id,
        day_index: index,
        day_kind: "scheduled",
        source: "program",
        label: day.label,
        focus: day.focus,
        estimated_minutes: program.sessionMinutes,
      })
      .select("id")
      .single();
    if (dayError || !dayRow) {
      return NextResponse.json(
        { ok: false, error: dayError?.message ?? "Could not save day." },
        { status: 500 },
      );
    }
    const inserts = [];
    for (const [sort, ex] of day.exercises.entries()) {
      const resolved = await resolveExerciseForProgram(
        supabase,
        user.id,
        ex.name,
        (catalog as Exercise[]) ?? [],
        cache,
      );
      if (!resolved.ok) continue;
      inserts.push({
        day_id: dayRow.id,
        exercise_id: resolved.exercise.id,
        sort_order: sort,
        sets: ex.sets,
        rep_min: ex.repMin,
        rep_max: ex.repMax,
        set_style: "hypertrophy",
        rest_sec: ex.restSec,
        superset_group: ex.supersetGroup ?? null,
      });
    }
    if (inserts.length) {
      await supabase.from("workout_program_exercises").insert(inserts);
    }
  }

  return NextResponse.json({ ok: true, programId: created.id });
}
