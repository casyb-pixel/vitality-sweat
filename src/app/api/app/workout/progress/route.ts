import { NextResponse } from "next/server";
import { estimatedOneRepMaxLb } from "@/lib/fitness/one-rep-max";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_lb: number | null;
  reps: number | null;
  difficulty: number;
  duration_sec: number | null;
  distance_m: number | null;
  created_at: string;
};

/** Per-exercise history for progress charts. */
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
    const exerciseId = searchParams.get("exercise_id")?.trim();

    const { data: sessions, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("id, started_at, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: true })
      .limit(120);

    if (sessionError) {
      return NextResponse.json(
        { ok: false, error: sessionError.message },
        { status: 500 },
      );
    }

    if (!sessions?.length) {
      return NextResponse.json({
        ok: true,
        points: [],
        exercises: [],
        totals: { sessions: 0, sets: 0 },
      });
    }

    const sessionIds = sessions.map((s) => s.id);
    const sessionAt = new Map(
      sessions.map((s) => [s.id as string, s.started_at as string]),
    );

    let setQuery = supabase
      .from("workout_sets")
      .select(
        "id, session_id, exercise_id, set_number, weight_lb, reps, difficulty, duration_sec, distance_m, created_at",
      )
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true })
      .limit(2000);

    if (exerciseId) {
      setQuery = setQuery.eq("exercise_id", exerciseId);
    }

    const { data: sets, error: setError } = await setQuery;
    if (setError) {
      return NextResponse.json(
        { ok: false, error: setError.message },
        { status: 500 },
      );
    }

    const rows = (sets ?? []) as SetRow[];
    const exerciseIds = [...new Set(rows.map((r) => r.exercise_id))];
    let exercises: { id: string; name: string }[] = [];
    if (exerciseIds.length) {
      const { data: exRows } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds);
      exercises = (exRows ?? []) as { id: string; name: string }[];
    }

    const bySession = new Map<string, SetRow[]>();
    for (const row of rows) {
      const list = bySession.get(row.session_id) ?? [];
      list.push(row);
      bySession.set(row.session_id, list);
    }

    const points = [...bySession.entries()].map(([sid, sessionSets]) => {
      const bestWeight = sessionSets.reduce<number | null>((best, s) => {
        if (s.weight_lb == null) return best;
        if (best == null || s.weight_lb > best) return s.weight_lb;
        return best;
      }, null);
      const volume = sessionSets.reduce((sum, s) => {
        if (s.weight_lb == null || s.reps == null) return sum;
        return sum + s.weight_lb * s.reps;
      }, 0);
      const e1rm = sessionSets.reduce<number | null>((best, s) => {
        if (s.weight_lb == null || s.reps == null) return best;
        const est = estimatedOneRepMaxLb(s.weight_lb, s.reps);
        if (est == null) return best;
        if (best == null || est > best) return est;
        return best;
      }, null);
      return {
        sessionId: sid,
        startedAt: sessionAt.get(sid) ?? null,
        sets: sessionSets.length,
        bestWeightLb: bestWeight,
        volume,
        estimated1rmLb: e1rm,
      };
    });

    return NextResponse.json({
      ok: true,
      points,
      exercises,
      totals: {
        sessions: sessions.length,
        sets: rows.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
