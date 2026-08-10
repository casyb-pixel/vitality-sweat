import { NextResponse } from "next/server";
import { suggestProgression } from "@/lib/fitness/progression";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/** Log one or more sets into an active session. */
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

    let body: {
      session_id?: string;
      exercise_id?: string;
      set_number?: number;
      weight_lb?: number | null;
      reps?: number | null;
      difficulty?: number;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const sessionId = body.session_id?.trim();
    const exerciseId = body.exercise_id?.trim();
    const setNumber = Number(body.set_number);
    const difficulty = Number(body.difficulty);

    if (!sessionId || !exerciseId) {
      return NextResponse.json(
        { ok: false, error: "Send session_id and exercise_id." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(setNumber) || setNumber < 1) {
      return NextResponse.json(
        { ok: false, error: "set_number must be a positive integer." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      return NextResponse.json(
        { ok: false, error: "difficulty must be 1–5." },
        { status: 400 },
      );
    }

    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id, status, user_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!session || session.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Active workout session not found." },
        { status: 404 },
      );
    }

    const weight =
      body.weight_lb === null || body.weight_lb === undefined
        ? null
        : Number(body.weight_lb);
    const reps =
      body.reps === null || body.reps === undefined
        ? null
        : Number(body.reps);

    if (weight != null && (!Number.isFinite(weight) || weight < 0)) {
      return NextResponse.json(
        { ok: false, error: "weight_lb must be >= 0." },
        { status: 400 },
      );
    }
    if (reps != null && (!Number.isInteger(reps) || reps < 0)) {
      return NextResponse.json(
        { ok: false, error: "reps must be a non-negative integer." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("workout_sets")
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_lb: weight,
        reps,
        difficulty,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, set: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Fetch last performance + progression suggestion for an exercise. */
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
    const sessionId = searchParams.get("session_id")?.trim();
    const exerciseId = searchParams.get("exercise_id")?.trim();

    if (sessionId) {
      const { data: session } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!session) {
        return NextResponse.json(
          { ok: false, error: "Session not found." },
          { status: 404 },
        );
      }

      const { data: sets, error } = await supabase
        .from("workout_sets")
        .select(
          "id, session_id, exercise_id, set_number, weight_lb, reps, difficulty, created_at",
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, sets: sets ?? [] });
    }

    if (!exerciseId) {
      return NextResponse.json(
        { ok: false, error: "Pass exercise_id or session_id." },
        { status: 400 },
      );
    }

    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id, started_at, status")
      .eq("user_id", user.id)
      .in("status", ["completed", "active"])
      .order("started_at", { ascending: false })
      .limit(20);

    if (!sessions?.length) {
      return NextResponse.json({
        ok: true,
        sets: [],
        suggestion: null,
      });
    }

    const sessionIds = sessions.map((s) => s.id);

    const { data: sets, error } = await supabase
      .from("workout_sets")
      .select("id, session_id, exercise_id, set_number, weight_lb, reps, difficulty, created_at")
      .eq("exercise_id", exerciseId)
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const rows = sets ?? [];
    if (!rows.length) {
      return NextResponse.json({ ok: true, sets: [], suggestion: null });
    }

    // Use the most recent session that has this exercise.
    const latestSessionId = rows[0]!.session_id;
    const latestSets = rows
      .filter((s) => s.session_id === latestSessionId)
      .sort((a, b) => a.set_number - b.set_number);

    const suggestion = suggestProgression(
      exerciseId,
      latestSets.map((s) => ({
        weight_lb: s.weight_lb,
        reps: s.reps,
        difficulty: s.difficulty,
        set_number: s.set_number,
      })),
    );

    return NextResponse.json({
      ok: true,
      sets: latestSets,
      suggestion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
