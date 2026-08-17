import { NextResponse } from "next/server";
import { detectPersonalBest } from "@/lib/fitness/milestones";
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
      duration_sec?: number | null;
      distance_m?: number | null;
      incline_pct?: number | null;
      elevation_m?: number | null;
      set_kind?: string | null;
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
    const durationSec =
      body.duration_sec === null || body.duration_sec === undefined
        ? null
        : Number(body.duration_sec);
    const distanceM =
      body.distance_m === null || body.distance_m === undefined
        ? null
        : Number(body.distance_m);
    const inclinePct =
      body.incline_pct === null || body.incline_pct === undefined
        ? null
        : Number(body.incline_pct);
    const elevationM =
      body.elevation_m === null || body.elevation_m === undefined
        ? null
        : Number(body.elevation_m);
    const setKindRaw = (body.set_kind ?? "working").trim();
    const setKind = ["warmup", "working", "drop", "failure", "timed"].includes(
      setKindRaw,
    )
      ? setKindRaw
      : "working";

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
    if (durationSec != null && (!Number.isFinite(durationSec) || durationSec < 0)) {
      return NextResponse.json(
        { ok: false, error: "duration_sec must be >= 0." },
        { status: 400 },
      );
    }
    if (distanceM != null && (!Number.isFinite(distanceM) || distanceM < 0)) {
      return NextResponse.json(
        { ok: false, error: "distance_m must be >= 0." },
        { status: 400 },
      );
    }
    if (inclinePct != null && (!Number.isFinite(inclinePct) || inclinePct < 0 || inclinePct > 40)) {
      return NextResponse.json(
        { ok: false, error: "incline_pct must be 0 to 40." },
        { status: 400 },
      );
    }
    if (elevationM != null && (!Number.isFinite(elevationM) || elevationM < 0)) {
      return NextResponse.json(
        { ok: false, error: "elevation_m must be >= 0." },
        { status: 400 },
      );
    }

    // Prior sets for PR detection (other sessions + earlier sets today).
    const { data: priorSessions } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["completed", "active"])
      .limit(40);

    const priorSessionIds = (priorSessions ?? [])
      .map((s) => s.id)
      .filter((id) => id !== sessionId);

    let priorSets: { weight_lb: number | null; reps: number | null }[] = [];
    if (priorSessionIds.length > 0) {
      const { data: priorRows } = await supabase
        .from("workout_sets")
        .select("weight_lb, reps")
        .eq("exercise_id", exerciseId)
        .in("session_id", priorSessionIds)
        .limit(120);
      priorSets = priorRows ?? [];
    }

    const { data: sessionPrior } = await supabase
      .from("workout_sets")
      .select("weight_lb, reps")
      .eq("session_id", sessionId)
      .eq("exercise_id", exerciseId)
      .limit(40);
    priorSets = [...priorSets, ...(sessionPrior ?? [])];

    const { data: exercise } = await supabase
      .from("exercises")
      .select("name")
      .eq("id", exerciseId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("workout_sets")
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_lb: weight,
        reps,
        difficulty,
        duration_sec: durationSec,
        distance_m: distanceM,
        incline_pct: inclinePct,
        elevation_m: elevationM,
        set_kind: setKind,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const milestone = detectPersonalBest({
      exerciseId,
      exerciseName:
        typeof exercise?.name === "string" ? exercise.name : null,
      weightLb: weight,
      reps,
      priorSets,
    });

    return NextResponse.json({ ok: true, set: data, milestone });
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
          "id, session_id, exercise_id, set_number, weight_lb, reps, difficulty, duration_sec, distance_m, set_kind, created_at",
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
      .select("id, session_id, exercise_id, set_number, weight_lb, reps, difficulty, duration_sec, distance_m, set_kind, created_at")
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
    const latestSession = sessions.find((s) => s.id === latestSessionId);
    const lastSessionAt =
      typeof latestSession?.started_at === "string"
        ? latestSession.started_at
        : null;
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
      { lastSessionAt },
    );

    return NextResponse.json({
      ok: true,
      sets: latestSets,
      suggestion,
      last_session_at: lastSessionAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Edit a logged set (history or active session). */
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

    let body: {
      id?: string;
      weight_lb?: number | null;
      reps?: number | null;
      difficulty?: number;
      duration_sec?: number | null;
      distance_m?: number | null;
      set_kind?: string;
      notes?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Send id." },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("workout_sets")
      .select("id, session_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Set not found." },
        { status: 404 },
      );
    }

    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("id", existing.session_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Set not found." },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = {};
    if ("weight_lb" in body) patch.weight_lb = body.weight_lb;
    if ("reps" in body) patch.reps = body.reps;
    if ("difficulty" in body) patch.difficulty = body.difficulty;
    if ("duration_sec" in body) patch.duration_sec = body.duration_sec;
    if ("distance_m" in body) patch.distance_m = body.distance_m;
    if (typeof body.set_kind === "string") patch.set_kind = body.set_kind;

    const { data, error } = await supabase
      .from("workout_sets")
      .update(patch)
      .eq("id", id)
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

export async function DELETE(request: Request) {
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

    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Pass id." },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("workout_sets")
      .select("id, session_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Set not found." },
        { status: 404 },
      );
    }

    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("id", existing.session_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Set not found." },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("workout_sets").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
