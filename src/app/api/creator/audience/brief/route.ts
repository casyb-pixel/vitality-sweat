import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import {
  AUDIENCE_WINDOW_DAYS,
  buildAudienceMetrics,
} from "@/lib/creator/audience";
import {
  audienceBriefToMarkdown,
  buildAudienceBrief,
} from "@/lib/markets/audience-brief";
import { normalizeMarketParam } from "@/lib/markets/metros";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Audience Brief export for sales (Markdown or JSON).
 * GET ?market=lafayette&format=md|json
 */
export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const format = (url.searchParams.get("format") ?? "json").toLowerCase();
    const marketRaw = url.searchParams.get("market");
    const marketFocus =
      marketRaw === "all"
        ? ("all" as const)
        : normalizeMarketParam(marketRaw) ?? ("lafayette" as const);

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
      eventsRes,
      campaignsRes,
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
      admin
        .from("sponsor_ad_events")
        .select("slot_id, event_type, market")
        .gte("created_at", sinceIso),
      admin
        .from("sponsor_campaigns")
        .select(
          "id, name, status, is_house, target_zips, target_markets, sponsors ( name )",
        )
        .eq("status", "active")
        .eq("is_house", false)
        .limit(1),
    ]);

    if (profilesRes.error) {
      console.error("[audience/brief] profiles", profilesRes.error.message);
      return NextResponse.json(
        { ok: false, error: "Could not load member geography." },
        { status: 500 },
      );
    }
    if (workoutsRes.error || mealPlansCreatedRes.error || mealPlansUpdatedRes.error) {
      console.error(
        "[audience/brief] activity",
        workoutsRes.error?.message ??
          mealPlansCreatedRes.error?.message ??
          mealPlansUpdatedRes.error?.message,
      );
      return NextResponse.json(
        { ok: false, error: "Could not load activity." },
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

    const slotMap = new Map<string, { impressions: number; clicks: number }>();
    for (const ev of eventsRes.data ?? []) {
      const slotId = (ev.slot_id as string) || "unknown";
      let bucket = slotMap.get(slotId);
      if (!bucket) {
        bucket = { impressions: 0, clicks: 0 };
        slotMap.set(slotId, bucket);
      }
      if (ev.event_type === "impression") bucket.impressions += 1;
      else if (ev.event_type === "click") bucket.clicks += 1;
    }
    const topSlots = [...slotMap.entries()]
      .map(([slotId, b]) => ({
        slotId,
        impressions: b.impressions,
        clicks: b.clicks,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8);

    let campaignProof = null;
    const campaign = campaignsRes.data?.[0];
    if (campaign?.id) {
      const { buildCampaignProof } = await import("@/lib/sponsors/serve");
      const activeIds = new Set<string>();
      for (const w of workoutsRes.data ?? []) activeIds.add(w.user_id);
      for (const m of mealById.values()) activeIds.add(m.user_id);
      campaignProof = await buildCampaignProof(admin, campaign.id as string, {
        activeMemberIds: activeIds,
        profilesWithZip: (profilesRes.data ?? []).map((p) => ({
          id: p.id,
          zip_code: p.zip_code,
        })),
      });
    }

    const brief = buildAudienceBrief({
      metrics,
      marketFocus,
      topSlots,
      campaignProof,
    });

    if (format === "md" || format === "markdown") {
      const markdown = audienceBriefToMarkdown(brief);
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="audience-brief-${brief.marketFocus}.md"`,
        },
      });
    }

    return NextResponse.json({ ok: true, brief });
  } catch (err) {
    console.error("[audience/brief]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
