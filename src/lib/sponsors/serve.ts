/**
 * Local sponsorship serve + proof helpers (direct-sold, not AdSense).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveInventorySlotId } from "@/lib/sponsors/slots";

export type ServedCreative = {
  creativeId: string;
  campaignId: string;
  sponsorId: string;
  sponsorName: string;
  slotId: string;
  inventorySlotId: string;
  headline: string;
  body: string | null;
  imageUrl: string | null;
  clickUrl: string;
  ctaLabel: string;
  isHouse: boolean;
};

type CreativeJoinRow = {
  id: string;
  campaign_id: string;
  slot_id: string;
  headline: string;
  body: string | null;
  image_url: string | null;
  click_url: string;
  cta_label: string;
  priority: number;
  is_active: boolean;
  sponsor_campaigns: {
    id: string;
    sponsor_id: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    is_house: boolean;
    target_zips: string[] | null;
    sponsors: {
      id: string;
      name: string;
      is_active: boolean;
    } | null;
  } | null;
};

function isFlightLive(campaign: {
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}): boolean {
  if (campaign.status !== "active") return false;
  const now = Date.now();
  if (campaign.starts_at && new Date(campaign.starts_at).getTime() > now) {
    return false;
  }
  if (campaign.ends_at && new Date(campaign.ends_at).getTime() < now) {
    return false;
  }
  return true;
}

function zipMatch(
  targetZips: string[] | null | undefined,
  visitorZip: string | null | undefined,
): boolean {
  if (!targetZips || targetZips.length === 0) return true;
  if (!visitorZip) return true; // soft: unknown ZIP still sees geo-targeted (avoid empty inventory)
  const zip5 = visitorZip.replace(/\D/g, "").slice(0, 5);
  return targetZips.some((z) => z.replace(/\D/g, "").slice(0, 5) === zip5);
}

/**
 * Pick the best creative for a slot.
 * Paid (non-house) creatives beat house fallback. Lower priority wins.
 */
export async function serveCreativeForSlot(
  admin: SupabaseClient,
  input: {
    slotId: string;
    visitorZip?: string | null;
  },
): Promise<ServedCreative | null> {
  const inventorySlotId = resolveInventorySlotId(input.slotId);

  const { data, error } = await admin
    .from("sponsor_creatives")
    .select(
      `
      id,
      campaign_id,
      slot_id,
      headline,
      body,
      image_url,
      click_url,
      cta_label,
      priority,
      is_active,
      sponsor_campaigns!inner (
        id,
        sponsor_id,
        status,
        starts_at,
        ends_at,
        is_house,
        target_zips,
        sponsors!inner (
          id,
          name,
          is_active
        )
      )
    `,
    )
    .eq("slot_id", inventorySlotId)
    .eq("is_active", true);

  if (error || !data?.length) {
    if (error) console.error("[sponsors/serve]", error.message);
    return null;
  }

  const rows = data as unknown as CreativeJoinRow[];
  const eligible = rows.filter((row) => {
    const campaign = row.sponsor_campaigns;
    const sponsor = campaign?.sponsors;
    if (!campaign || !sponsor?.is_active) return false;
    if (!isFlightLive(campaign)) return false;
    if (!zipMatch(campaign.target_zips, input.visitorZip)) return false;
    return true;
  });

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const aHouse = a.sponsor_campaigns?.is_house ? 1 : 0;
    const bHouse = b.sponsor_campaigns?.is_house ? 1 : 0;
    if (aHouse !== bHouse) return aHouse - bHouse;
    return (a.priority ?? 100) - (b.priority ?? 100);
  });

  const best = eligible[0];
  const campaign = best.sponsor_campaigns!;
  const sponsor = campaign.sponsors!;

  return {
    creativeId: best.id,
    campaignId: campaign.id,
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    slotId: input.slotId,
    inventorySlotId,
    headline: best.headline,
    body: best.body,
    imageUrl: best.image_url,
    clickUrl: best.click_url,
    ctaLabel: best.cta_label || "Learn more",
    isHouse: Boolean(campaign.is_house),
  };
}

export type CampaignProofMetrics = {
  campaignId: string;
  campaignName: string;
  sponsorName: string;
  status: string;
  isHouse: boolean;
  startsAt: string | null;
  endsAt: string | null;
  targetZips: string[];
  impressions: number;
  clicks: number;
  ctr: number;
  bySlot: { slotId: string; impressions: number; clicks: number }[];
  localActivesInTargetZips: number | null;
  localActivesDefinition: string;
};

export async function buildCampaignProof(
  admin: SupabaseClient,
  campaignId: string,
  opts?: {
    activeMemberIds?: Set<string>;
    profilesWithZip?: { id: string; zip_code: string | null }[];
  },
): Promise<CampaignProofMetrics | null> {
  const { data: campaign, error } = await admin
    .from("sponsor_campaigns")
    .select(
      `
      id,
      name,
      status,
      starts_at,
      ends_at,
      target_zips,
      is_house,
      sponsors ( id, name )
    `,
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !campaign) {
    if (error) console.error("[sponsors/proof]", error.message);
    return null;
  }

  const { data: events } = await admin
    .from("sponsor_ad_events")
    .select("slot_id, event_type")
    .eq("campaign_id", campaignId);

  let impressions = 0;
  let clicks = 0;
  const slotMap = new Map<string, { impressions: number; clicks: number }>();

  for (const ev of events ?? []) {
    const slotId = (ev.slot_id as string) || "unknown";
    let bucket = slotMap.get(slotId);
    if (!bucket) {
      bucket = { impressions: 0, clicks: 0 };
      slotMap.set(slotId, bucket);
    }
    if (ev.event_type === "impression") {
      impressions += 1;
      bucket.impressions += 1;
    } else if (ev.event_type === "click") {
      clicks += 1;
      bucket.clicks += 1;
    }
  }

  const targetZips = (campaign.target_zips as string[]) ?? [];
  let localActivesInTargetZips: number | null = null;
  if (targetZips.length && opts?.profilesWithZip && opts.activeMemberIds) {
    const focus = new Set(
      targetZips.map((z) => z.replace(/\D/g, "").slice(0, 5)),
    );
    let count = 0;
    for (const profile of opts.profilesWithZip) {
      const zip5 = (profile.zip_code ?? "").replace(/\D/g, "").slice(0, 5);
      if (!focus.has(zip5)) continue;
      if (opts.activeMemberIds.has(profile.id)) count += 1;
    }
    localActivesInTargetZips = count;
  }

  const sponsorRel = campaign.sponsors as
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  const sponsorName = Array.isArray(sponsorRel)
    ? sponsorRel[0]?.name ?? "Sponsor"
    : sponsorRel?.name ?? "Sponsor";

  return {
    campaignId: campaign.id as string,
    campaignName: campaign.name as string,
    sponsorName,
    status: campaign.status as string,
    isHouse: Boolean(campaign.is_house),
    startsAt: (campaign.starts_at as string | null) ?? null,
    endsAt: (campaign.ends_at as string | null) ?? null,
    targetZips,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    bySlot: [...slotMap.entries()]
      .map(([slotId, b]) => ({
        slotId,
        impressions: b.impressions,
        clicks: b.clicks,
      }))
      .sort((a, b) => b.impressions - a.impressions),
    localActivesInTargetZips,
    localActivesDefinition:
      "Active (28d) members whose ZIP is in the campaign target set.",
  };
}

export function slugifySponsorName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
