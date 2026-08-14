import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export type LiveReferralCampaign = {
  id: string;
  name: string;
  prize_label: string;
  active_needed: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
};

export type CrewStats = {
  joined: number;
  active: number;
  campaign: LiveReferralCampaign | null;
  progress: number;
  qualified: boolean;
};

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export async function getLiveCampaign(
  supabase: SupabaseClient,
): Promise<LiveReferralCampaign | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("referral_campaigns")
    .select("id, name, prize_label, active_needed, starts_at, ends_at, status")
    .eq("status", "active")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    console.error("[crew] live campaign", error.message);
    return null;
  }
  return (data as LiveReferralCampaign | null) ?? null;
}

async function referredIds(
  supabase: SupabaseClient,
  promoterId: string,
  since?: string | null,
  until?: string | null,
): Promise<string[]> {
  let query = supabase
    .from("profiles")
    .select("id, created_at")
    .eq("referred_by", promoterId);

  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  const { data, error } = await query;
  if (error) {
    console.error("[crew] referred ids", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

export async function countActiveMembers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<number> {
  if (userIds.length === 0) return 0;
  const unique = [...new Set(userIds)];

  const [{ data: sessions }, { data: meals }] = await Promise.all([
    supabase.from("workout_sessions").select("user_id").in("user_id", unique),
    supabase.from("meal_plans").select("user_id").in("user_id", unique),
  ]);

  const active = new Set<string>();
  for (const row of sessions ?? []) {
    if (typeof row.user_id === "string") active.add(row.user_id);
  }
  for (const row of meals ?? []) {
    if (typeof row.user_id === "string") active.add(row.user_id);
  }
  return active.size;
}

export async function getCrewStats(
  supabase: SupabaseClient,
  promoterId: string,
): Promise<CrewStats> {
  const campaign = await getLiveCampaign(supabase);
  const allIds = await referredIds(supabase, promoterId);
  const campaignIds = campaign
    ? await referredIds(
        supabase,
        promoterId,
        campaign.starts_at,
        campaign.ends_at,
      )
    : allIds;
  const active = await countActiveMembers(supabase, campaignIds);
  const progress = campaign
    ? Math.min(active, campaign.active_needed)
    : active;
  const qualified = Boolean(campaign && active >= campaign.active_needed);

  if (campaign && qualified) {
    await ensurePendingReward(supabase, {
      campaignId: campaign.id,
      promoterId,
      activeCount: active,
      prizeLabel: campaign.prize_label,
    });
  }

  return {
    joined: allIds.length,
    active,
    campaign,
    progress,
    qualified,
  };
}

export async function ensurePendingReward(
  supabase: SupabaseClient,
  input: {
    campaignId: string;
    promoterId: string;
    activeCount: number;
    prizeLabel: string;
  },
): Promise<void> {
  const admin = createServiceRoleClient() ?? supabase;
  const { error } = await admin.from("referral_rewards").upsert(
    {
      campaign_id: input.campaignId,
      promoter_id: input.promoterId,
      active_count_at_award: input.activeCount,
      prize_label: input.prizeLabel,
      status: "pending",
    },
    { onConflict: "campaign_id,promoter_id", ignoreDuplicates: true },
  );
  if (error && !isMissingRelation(error)) {
    console.error("[crew] ensure reward", error.message);
  }
}

export type PromoterRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  joined: number;
  active: number;
  last_referred_at: string | null;
};

export async function getPromoterLeaderboard(
  supabase: SupabaseClient,
  campaign: LiveReferralCampaign | null,
): Promise<PromoterRow[]> {
  let query = supabase
    .from("profiles")
    .select("id, referred_by, created_at")
    .not("referred_by", "is", null);

  if (campaign) {
    query = query.gte("created_at", campaign.starts_at);
    if (campaign.ends_at) query = query.lte("created_at", campaign.ends_at);
  }

  const { data: referred, error } = await query;
  if (error || !referred) return [];

  const byPromoter = new Map<
    string,
    { ids: string[]; last: string | null }
  >();
  for (const row of referred) {
    const pid = row.referred_by as string;
    const bucket = byPromoter.get(pid) ?? { ids: [], last: null };
    bucket.ids.push(row.id as string);
    const created = row.created_at as string;
    if (!bucket.last || created > bucket.last) bucket.last = created;
    byPromoter.set(pid, bucket);
  }

  const promoterIds = [...byPromoter.keys()];
  if (promoterIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", promoterIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        display_name: (p.display_name as string | null) ?? null,
        username: (p.username as string | null) ?? null,
      },
    ]),
  );

  const rows: PromoterRow[] = [];
  for (const [id, bucket] of byPromoter) {
    const active = await countActiveMembers(supabase, bucket.ids);
    const profile = profileMap.get(id);
    rows.push({
      id,
      display_name: profile?.display_name ?? null,
      username: profile?.username ?? null,
      joined: bucket.ids.length,
      active,
      last_referred_at: bucket.last,
    });
  }

  rows.sort((a, b) => b.active - a.active || b.joined - a.joined);
  return rows;
}
