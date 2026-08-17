import { NextResponse } from "next/server";
import { latestBodyWeightLb } from "@/lib/fitness/body-logs";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const SET_SELECT =
  "id, session_id, exercise_id, set_number, weight_lb, reps, difficulty, duration_sec, distance_m, incline_pct, elevation_m, set_kind, created_at";

/** Start a new active workout session (or resume the existing one). */
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

    let programDayId: string | null = null;
    try {
      const body = (await request.json()) as { program_day_id?: unknown };
      if (typeof body.program_day_id === "string" && body.program_day_id.trim()) {
        programDayId = body.program_day_id.trim();
      }
    } catch {
      // Empty body is fine for freeform sessions.
    }

    if (programDayId) {
      const { data: day } = await supabase
        .from("workout_program_days")
        .select("id")
        .eq("id", programDayId)
        .maybeSingle();

      if (!day) {
        return NextResponse.json(
          { ok: false, error: "Program day not found." },
          { status: 404 },
        );
      }
    }

    const { data: existing } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (programDayId && existing.program_day_id !== programDayId) {
        const { data: patched, error: patchError } = await supabase
          .from("workout_sessions")
          .update({ program_day_id: programDayId })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (patchError || !patched) {
          return NextResponse.json(
            { ok: false, error: patchError?.message ?? "Could not attach day." },
            { status: 500 },
          );
        }
        return NextResponse.json({
          ok: true,
          session: patched,
          resumed: true,
        });
      }

      return NextResponse.json({ ok: true, session: existing, resumed: true });
    }

    const bodyWeightLb = await latestBodyWeightLb(supabase, user.id);

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        status: "active",
        program_day_id: programDayId,
        body_weight_lb: bodyWeightLb,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, session: data, resumed: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** List history or load one session with sets. */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id")?.trim();

    if (sessionId) {
      const { data: session, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }
      if (!session) {
        return NextResponse.json(
          { ok: false, error: "Session not found." },
          { status: 404 },
        );
      }

      const { data: sets, error: setsError } = await supabase
        .from("workout_sets")
        .select(SET_SELECT)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (setsError) {
        return NextResponse.json(
          { ok: false, error: setsError.message },
          { status: 500 },
        );
      }

      const exerciseIds = [
        ...new Set((sets ?? []).map((s) => s.exercise_id as string)),
      ];
      let exercises: { id: string; name: string; tracking_type: string }[] = [];
      if (exerciseIds.length) {
        const { data: exRows } = await supabase
          .from("exercises")
          .select("id, name, tracking_type")
          .in("id", exerciseIds);
        exercises = (exRows ?? []) as typeof exercises;
      }

      return NextResponse.json({
        ok: true,
        session,
        sets: sets ?? [],
        exercises,
      });
    }

    const limit = Math.min(
      60,
      Math.max(1, Number(searchParams.get("limit") ?? 30) || 30),
    );

    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["completed", "cancelled", "active"])
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, sessions: sessions ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Complete the active session, or update notes on a past session. */
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

    let body: { session_id?: string; status?: string; notes?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const sessionId = body.session_id?.trim();
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Send session_id." },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (body.status === "cancelled" || body.status === "completed") {
      patch.status = body.status;
      patch.ended_at = new Date().toISOString();
    }
    if (typeof body.notes === "string") {
      patch.notes = body.notes;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nothing to update." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, session: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
