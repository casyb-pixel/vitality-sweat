import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

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
      // RLS limits this to the member's own program days.
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

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        status: "active",
        program_day_id: programDayId,
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
