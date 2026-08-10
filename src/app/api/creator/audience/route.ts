import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import {
  AUDIENCE_WINDOW_DAYS,
  buildAudienceMetrics,
} from "@/lib/creator/audience";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Aggregated local-audience metrics for Creator Studio sponsorship pitches.
 * Service role reads + creator auth. Returns counts only — no emails/PII.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = await resolveAccessDecision(supabase, user);
    if (access.status !== "creator") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized — creator privileges required." },
        { status: 401 },
      );
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Server misconfigured — service role key unavailable.",
        },
        { status: 500 },
      );
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - AUDIENCE_WINDOW_DAYS);
    const sinceIso = since.toISOString();

    const [
      profilesRes,
      totalRes,
      referredRes,
      workoutsRes,
      mealPlansCreatedRes,
      mealPlansUpdatedRes,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id, city, zip_code, region, referred_by")
        .not("zip_code", "is", null),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("referred_by", "is", null),
      admin
        .from("workout_sessions")
        .select("id, user_id")
        .gte("started_at", sinceIso),
      admin
        .from("meal_plans")
        .select("id, user_id, grocery_share_token")
        .gte("created_at", sinceIso),
      admin
        .from("meal_plans")
        .select("id, user_id, grocery_share_token")
        .gte("updated_at", sinceIso)
        .lt("created_at", sinceIso),
    ]);

    if (profilesRes.error) {
      console.error("[creator/audience] profiles", profilesRes.error.message);
      return NextResponse.json(
        { ok: false, error: "Could not load member geography." },
        { status: 500 },
      );
    }
    if (workoutsRes.error) {
      console.error("[creator/audience] workouts", workoutsRes.error.message);
      return NextResponse.json(
        { ok: false, error: "Could not load workout activity." },
        { status: 500 },
      );
    }
    if (mealPlansCreatedRes.error || mealPlansUpdatedRes.error) {
      console.error(
        "[creator/audience] meal_plans",
        mealPlansCreatedRes.error?.message ??
          mealPlansUpdatedRes.error?.message,
      );
      return NextResponse.json(
        { ok: false, error: "Could not load meal / grocery activity." },
        { status: 500 },
      );
    }

    const mealById = new Map<
      string,
      { id: string; user_id: string; grocery_share_token: string | null }
    >();
    for (const row of mealPlansCreatedRes.data ?? []) {
      mealById.set(row.id, row);
    }
    for (const row of mealPlansUpdatedRes.data ?? []) {
      mealById.set(row.id, row);
    }

    const metrics = buildAudienceMetrics({
      sinceIso,
      profiles: profilesRes.data ?? [],
      registeredTotal: totalRes.count ?? 0,
      referredTotal: referredRes.count ?? 0,
      workouts: workoutsRes.data ?? [],
      mealPlans: [...mealById.values()],
    });

    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    console.error("[creator/audience]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
