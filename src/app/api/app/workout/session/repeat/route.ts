import { NextResponse } from "next/server";
import { fetchActiveNestedProgram } from "@/lib/fitness/program-query";
import {
  resolveRepeatTargetDayId,
  saveSessionToDay,
} from "@/lib/fitness/save-session-to-day";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/** Seed a split day from a past session so the member can run it again. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: { session_id?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const sessionId =
      typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Send session_id." },
        { status: 400 },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("id, program_day_id, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json(
        { ok: false, error: sessionError.message },
        { status: 500 },
      );
    }
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found." },
        { status: 404 },
      );
    }

    const { count, error: setsError } = await supabase
      .from("workout_sets")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (setsError) {
      return NextResponse.json(
        { ok: false, error: setsError.message },
        { status: 500 },
      );
    }
    if (!count) {
      return NextResponse.json(
        { ok: false, error: "That session has no sets to repeat." },
        { status: 400 },
      );
    }

    const program = await fetchActiveNestedProgram(supabase, user.id);
    if (!program) {
      return NextResponse.json(
        {
          ok: false,
          error: "Build a split first so this workout can be saved to a day.",
        },
        { status: 400 },
      );
    }

    const programDayId = resolveRepeatTargetDayId({
      sessionProgramDayId: session.program_day_id,
      activeDays: program.days ?? [],
    });
    if (!programDayId) {
      return NextResponse.json(
        { ok: false, error: "No program day available to save this workout." },
        { status: 400 },
      );
    }

    const saved = await saveSessionToDay(supabase, {
      sessionId,
      programDayId,
      userId: user.id,
    });
    if (!saved.ok) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 500 });
    }

    const day = (program.days ?? []).find((row) => row.id === programDayId);

    return NextResponse.json({
      ok: true,
      program_day_id: programDayId,
      day_label: day?.label ?? null,
      inserted: saved.inserted,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
