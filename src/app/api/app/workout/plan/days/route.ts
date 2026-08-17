import { NextResponse } from "next/server";
import { fetchNestedProgramById } from "@/lib/fitness/program-query";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/** Add a scheduled day to the active program. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const { data: program } = await supabase
      .from("workout_programs")
      .select("id, days_per_week, session_minutes")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!program) {
      return NextResponse.json(
        { ok: false, error: "Build a split first, then add a day." },
        { status: 404 },
      );
    }

    const { data: existing } = await supabase
      .from("workout_program_days")
      .select("day_index")
      .eq("program_id", program.id)
      .eq("day_kind", "scheduled")
      .order("day_index", { ascending: false })
      .limit(1);

    const nextIndex =
      existing?.[0]?.day_index != null ? Number(existing[0].day_index) + 1 : 0;
    if (nextIndex >= 7) {
      return NextResponse.json(
        { ok: false, error: "A split can have at most 7 scheduled days." },
        { status: 400 },
      );
    }

    const label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim().slice(0, 80)
        : `Day ${nextIndex + 1}`;
    const focus =
      typeof body.focus === "string" && body.focus.trim()
        ? body.focus.trim().slice(0, 80)
        : null;
    const minutesRaw = body.estimated_minutes;
    const estimatedMinutes =
      minutesRaw == null || minutesRaw === ""
        ? program.session_minutes ?? 45
        : Number(minutesRaw);
    if (
      !Number.isInteger(estimatedMinutes) ||
      estimatedMinutes < 5 ||
      estimatedMinutes > 180
    ) {
      return NextResponse.json(
        { ok: false, error: "Estimated minutes must be 5 to 180." },
        { status: 400 },
      );
    }

    const { data: day, error } = await supabase
      .from("workout_program_days")
      .insert({
        program_id: program.id,
        day_index: nextIndex,
        day_kind: "scheduled",
        source: "program",
        label,
        focus,
        estimated_minutes: estimatedMinutes,
        customized_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error || !day) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not add day." },
        { status: 500 },
      );
    }

    await supabase
      .from("workout_programs")
      .update({ days_per_week: nextIndex + 1 })
      .eq("id", program.id);

    const nested = await fetchNestedProgramById(supabase, program.id);
    return NextResponse.json({
      ok: true,
      day: { ...day, exercises: [] },
      program: nested,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
