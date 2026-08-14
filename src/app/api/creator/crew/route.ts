import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import {
  getLiveCampaign,
  getPromoterLeaderboard,
} from "@/lib/referrals/crew";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

async function requireCreatorJson() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = await resolveAccessDecision(supabase, user);
  if (access.status !== "creator") {
    return {
      supabase,
      error: NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      ),
    };
  }
  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await requireCreatorJson();
  if (error) return error;
  const campaign = await getLiveCampaign(supabase);
  const leaderboard = await getPromoterLeaderboard(supabase, campaign);

  const { data: rewards } = await supabase
    .from("referral_rewards")
    .select(
      "id, campaign_id, promoter_id, active_count_at_award, status, prize_label, shipping_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: campaigns } = await supabase
    .from("referral_campaigns")
    .select(
      "id, name, prize_label, active_needed, starts_at, ends_at, status, created_at",
    )
    .order("starts_at", { ascending: false })
    .limit(20);

  const promoterIds = [
    ...new Set((rewards ?? []).map((r) => r.promoter_id as string)),
  ];
  const { data: profiles } =
    promoterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, username, email")
          .in("id", promoterIds)
      : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p]),
  );

  const { data: reports } = await supabase
    .from("engine_room_reports")
    .select("id, reporter_id, post_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    ok: true,
    campaign,
    campaigns: campaigns ?? [],
    leaderboard,
    rewards: (rewards ?? []).map((row) => ({
      ...row,
      promoter: profileMap.get(row.promoter_id as string) ?? null,
    })),
    reports: reports ?? [],
  });
}

export async function POST(request: Request) {
  const gate = await requireCreatorJson();
  if (gate.error) return gate.error;
  const supabase = gate.supabase;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const prize =
    typeof body.prize_label === "string" ? body.prize_label.trim() : "";
  const needed = Number(body.active_needed);
  if (!name || !prize || !Number.isFinite(needed) || needed < 1) {
    return NextResponse.json(
      { ok: false, error: "Send name, prize_label, and active_needed." },
      { status: 400 },
    );
  }

  if (body.end_current === true) {
    await supabase
      .from("referral_campaigns")
      .update({ status: "ended" })
      .eq("status", "active");
  }

  const { data, error } = await supabase
    .from("referral_campaigns")
    .insert({
      name,
      prize_label: prize,
      active_needed: Math.floor(needed),
      status: "active",
      ends_at:
        typeof body.ends_at === "string" && body.ends_at.trim()
          ? body.ends_at
          : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, campaign: data });
}

export async function PATCH(request: Request) {
  const gate = await requireCreatorJson();
  if (gate.error) return gate.error;
  const supabase = gate.supabase;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const rewardId = typeof body.reward_id === "string" ? body.reward_id : "";
  if (!rewardId) {
    return NextResponse.json({ ok: false, error: "reward_id required." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status === "pending" || body.status === "shipped" || body.status === "void") {
    patch.status = body.status;
  }
  if (typeof body.shipping_notes === "string") {
    patch.shipping_notes = body.shipping_notes;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("referral_rewards")
    .update(patch)
    .eq("id", rewardId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, reward: data });
}
