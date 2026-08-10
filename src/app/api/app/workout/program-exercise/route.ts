import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type PatchBody = {
  id?: string;
  baseline_weight_lb?: number;
  baseline_reps?: number;
  last_prescription?: {
    weight_lb?: number | null;
    reps?: number | null;
    set_style?: string;
    message?: string;
    source?: string;
    updated_at?: string;
  } | null;
};

/** Patch baseline and/or last_prescription on a planned program exercise. */
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

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Send program exercise id." },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};

    if ("baseline_weight_lb" in body || "baseline_reps" in body) {
      const weight = Number(body.baseline_weight_lb);
      const reps = Number(body.baseline_reps);
      if (!Number.isFinite(weight) || weight < 0) {
        return NextResponse.json(
          { ok: false, error: "baseline_weight_lb must be >= 0." },
          { status: 400 },
        );
      }
      if (!Number.isInteger(reps) || reps <= 0) {
        return NextResponse.json(
          { ok: false, error: "baseline_reps must be a positive integer." },
          { status: 400 },
        );
      }
      patch.baseline_weight_lb = weight;
      patch.baseline_reps = reps;
    }

    if ("last_prescription" in body) {
      if (body.last_prescription === null) {
        patch.last_prescription = null;
      } else if (
        body.last_prescription &&
        typeof body.last_prescription === "object"
      ) {
        const snap = body.last_prescription;
        const weight =
          snap.weight_lb === null || snap.weight_lb === undefined
            ? null
            : Number(snap.weight_lb);
        const reps =
          snap.reps === null || snap.reps === undefined
            ? null
            : Number(snap.reps);
        if (weight != null && (!Number.isFinite(weight) || weight < 0)) {
          return NextResponse.json(
            { ok: false, error: "last_prescription.weight_lb must be >= 0." },
            { status: 400 },
          );
        }
        if (reps != null && (!Number.isInteger(reps) || reps < 0)) {
          return NextResponse.json(
            {
              ok: false,
              error: "last_prescription.reps must be a non-negative integer.",
            },
            { status: 400 },
          );
        }
        patch.last_prescription = {
          weight_lb: weight,
          reps,
          set_style:
            typeof snap.set_style === "string" ? snap.set_style : "hypertrophy",
          message:
            typeof snap.message === "string"
              ? snap.message.slice(0, 500)
              : "",
          source:
            typeof snap.source === "string" ? snap.source : "progression",
          updated_at:
            typeof snap.updated_at === "string"
              ? snap.updated_at
              : new Date().toISOString(),
        };
      } else {
        return NextResponse.json(
          { ok: false, error: "last_prescription must be an object or null." },
          { status: 400 },
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update." },
        { status: 400 },
      );
    }

    // RLS ensures the member can only update their own program exercises.
    const { data, error } = await supabase
      .from("workout_program_exercises")
      .update(patch)
      .eq("id", id)
      .select(
        "id, baseline_weight_lb, baseline_reps, last_prescription, sets, rep_min, rep_max, set_style",
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error.code === "PGRST116"
              ? "Program exercise not found."
              : error.message,
        },
        { status: error.code === "PGRST116" ? 404 : 500 },
      );
    }

    return NextResponse.json({ ok: true, exercise: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
