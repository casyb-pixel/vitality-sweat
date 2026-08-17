import { NextResponse } from "next/server";
import { fetchNestedProgramById } from "@/lib/fitness/program-query";
import { markProgramDayCustomized } from "@/lib/fitness/plan-edits";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ dayId: string }> };

async function ownedScheduledDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dayId: string,
  userId: string,
) {
  const { data: day } = await supabase
    .from("workout_program_days")
    .select("id, program_id, day_kind, day_index, label")
    .eq("id", dayId)
    .maybeSingle();
  if (!day) return null;
  const { data: program } = await supabase
    .from("workout_programs")
    .select("id, user_id")
    .eq("id", day.program_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!program) return null;
  return { day, program };
}

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

    const owned = await ownedScheduledDay(supabase, dayId, user.id);
    if (!owned) {
      return NextResponse.json({ ok: false, error: "Day not found." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.label === "string" && body.label.trim()) {
      patch.label = body.label.trim().slice(0, 80);
    }
    if ("focus" in body) {
      patch.focus =
        typeof body.focus === "string" && body.focus.trim()
          ? body.focus.trim().slice(0, 80)
          : null;
    }
    if ("notes" in body) {
      patch.notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null;
    }
    if ("estimated_minutes" in body) {
      const minutes = Number(body.estimated_minutes);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 180) {
        return NextResponse.json(
          { ok: false, error: "Estimated minutes must be 5 to 180." },
          { status: 400 },
        );
      }
      patch.estimated_minutes = minutes;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No day fields to update." },
        { status: 400 },
      );
    }

    const { data: updated, error } = await supabase
      .from("workout_program_days")
      .update(patch)
      .eq("id", dayId)
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not update day." },
        { status: 500 },
      );
    }

    await markProgramDayCustomized(supabase, dayId);
    const nested = await fetchNestedProgramById(supabase, owned.program.id);
    return NextResponse.json({ ok: true, day: updated, program: nested });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { dayId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const owned = await ownedScheduledDay(supabase, dayId, user.id);
    if (!owned) {
      return NextResponse.json({ ok: false, error: "Day not found." }, { status: 404 });
    }
    if (owned.day.day_kind !== "scheduled") {
      return NextResponse.json(
        { ok: false, error: "Only scheduled plan days can be removed here." },
        { status: 400 },
      );
    }

    const { data: scheduled } = await supabase
      .from("workout_program_days")
      .select("id, day_index")
      .eq("program_id", owned.program.id)
      .eq("day_kind", "scheduled")
      .order("day_index", { ascending: true });

    const rows = scheduled ?? [];
    if (rows.length <= 1) {
      return NextResponse.json(
        { ok: false, error: "Keep at least one day in your split." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("workout_program_days")
      .delete()
      .eq("id", dayId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const remaining = rows.filter((row) => row.id !== dayId);
    for (const [index, row] of remaining.entries()) {
      if (row.day_index !== index) {
        await supabase
          .from("workout_program_days")
          .update({ day_index: index })
          .eq("id", row.id);
      }
    }

    await supabase
      .from("workout_programs")
      .update({ days_per_week: remaining.length })
      .eq("id", owned.program.id);

    const nested = await fetchNestedProgramById(supabase, owned.program.id);
    return NextResponse.json({ ok: true, program: nested });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
