import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/** Start a new active workout session (or return the existing active one). */
export async function POST() {
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

    const { data: existing } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, session: existing, resumed: true });
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({ user_id: user.id, status: "active" })
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

/** Complete the active session. */
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

    const status =
      body.status === "cancelled" ? "cancelled" : "completed";

    const { data, error } = await supabase
      .from("workout_sessions")
      .update({
        status,
        ended_at: new Date().toISOString(),
        notes: typeof body.notes === "string" ? body.notes : undefined,
      })
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
