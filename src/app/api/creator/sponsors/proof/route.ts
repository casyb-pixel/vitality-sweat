import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import {
  AUDIENCE_WINDOW_DAYS,
} from "@/lib/creator/audience";
import { buildCampaignProof } from "@/lib/sponsors/serve";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Deliverable proof for a sponsorship campaign:
 * impressions, clicks, CTR, per-slot breakdown, local actives in target ZIPs.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const access = await resolveAccessDecision(supabase, user);
    if (access.status !== "creator") {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Service role unavailable." },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    let campaignId = searchParams.get("campaignId")?.trim() || "";

    if (!campaignId) {
      // Default to first non-house active campaign (demo Red's).
      const { data: fallback } = await admin
        .from("sponsor_campaigns")
        .select("id")
        .eq("status", "active")
        .eq("is_house", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      campaignId = (fallback?.id as string) || "";
    }

    if (!campaignId) {
      return NextResponse.json({
        ok: true,
        proof: null,
        message: "No active paid campaigns yet.",
      });
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - AUDIENCE_WINDOW_DAYS);
    const sinceIso = since.toISOString();

    const [workoutsRes, mealCreated, mealUpdated, profilesRes] =
      await Promise.all([
        admin
          .from("workout_sessions")
          .select("user_id")
          .gte("started_at", sinceIso),
        admin
          .from("meal_plans")
          .select("user_id")
          .gte("created_at", sinceIso),
        admin
          .from("meal_plans")
          .select("user_id")
          .gte("updated_at", sinceIso),
        admin
          .from("profiles")
          .select("id, zip_code")
          .not("zip_code", "is", null),
      ]);

    const activeIds = new Set<string>();
    for (const row of workoutsRes.data ?? []) activeIds.add(row.user_id);
    for (const row of mealCreated.data ?? []) activeIds.add(row.user_id);
    for (const row of mealUpdated.data ?? []) activeIds.add(row.user_id);

    const proof = await buildCampaignProof(admin, campaignId, {
      activeMemberIds: activeIds,
      profilesWithZip: profilesRes.data ?? [],
    });

    // Campaign picker list
    const { data: campaigns } = await admin
      .from("sponsor_campaigns")
      .select("id, name, status, is_house, sponsors(name)")
      .order("created_at", { ascending: false })
      .limit(40);

    return NextResponse.json({
      ok: true,
      proof,
      campaigns: campaigns ?? [],
    });
  } catch (err) {
    console.error("[creator/sponsors/proof]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
