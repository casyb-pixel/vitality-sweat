/**
 * Gym / sponsor campaign attribution (Phase 1b).
 * Persists in sessionStorage and signup user_metadata for later sponsor reporting.
 */

import { absoluteUrl } from "@/lib/seo/site";

const STORAGE_KEY = "vs_campaign_attribution";

export type CampaignAttribution = {
  src: string | null;
  gym: string | null;
  market: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  capturedAt: string;
};

export type CampaignQueryInput = {
  src?: string | null;
  gym?: string | null;
  market?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
};

function cleanParam(value: string | null | undefined, max = 64): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return cleaned || null;
}

export function parseCampaignAttribution(
  input: CampaignQueryInput | URLSearchParams,
): CampaignAttribution | null {
  const get = (key: keyof CampaignQueryInput) => {
    if (input instanceof URLSearchParams) {
      return input.get(key);
    }
    return input[key] ?? null;
  };

  const src = cleanParam(get("src"));
  const gym = cleanParam(get("gym"), 48);
  const market = cleanParam(get("market"), 32);
  const utmSource = cleanParam(get("utm_source"));
  const utmMedium = cleanParam(get("utm_medium"));
  const utmCampaign = cleanParam(get("utm_campaign"), 80);
  const utmContent = cleanParam(get("utm_content"), 80);

  if (
    !src &&
    !gym &&
    !market &&
    !utmSource &&
    !utmMedium &&
    !utmCampaign &&
    !utmContent
  ) {
    return null;
  }

  return {
    src,
    gym,
    market,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    capturedAt: new Date().toISOString(),
  };
}

export function rememberCampaignAttribution(
  input: CampaignQueryInput | URLSearchParams | CampaignAttribution | null,
): void {
  if (typeof window === "undefined" || !input) return;
  const parsed =
    input && "capturedAt" in input
      ? (input as CampaignAttribution)
      : parseCampaignAttribution(input as CampaignQueryInput | URLSearchParams);
  if (!parsed) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function readRememberedCampaignAttribution(): CampaignAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignAttribution;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRememberedCampaignAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Flatten for Supabase auth user_metadata on signup. */
export function campaignToSignupMetadata(
  campaign: CampaignAttribution | null,
): Record<string, string> {
  if (!campaign) return {};
  const meta: Record<string, string> = {};
  if (campaign.src) meta.campaign_src = campaign.src;
  if (campaign.gym) meta.campaign_gym = campaign.gym;
  if (campaign.market) meta.campaign_market = campaign.market;
  if (campaign.utmSource) meta.utm_source = campaign.utmSource;
  if (campaign.utmMedium) meta.utm_medium = campaign.utmMedium;
  if (campaign.utmCampaign) meta.utm_campaign = campaign.utmCampaign;
  if (campaign.utmContent) meta.utm_content = campaign.utmContent;
  return meta;
}

export type SignupCampaignParams = {
  src?: string | null;
  gym?: string | null;
  market?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  ref?: string | null;
  nextPath?: string;
};

/** Public signup / invite deep-link with optional gym + UTM params. */
export function buildCampaignSignupPath(params: SignupCampaignParams = {}): string {
  const query = new URLSearchParams();
  query.set("auth", "signup");
  query.set("next", params.nextPath ?? "/app");
  if (params.ref) query.set("ref", params.ref);
  if (params.src) query.set("src", params.src);
  if (params.gym) query.set("gym", params.gym);
  if (params.market) query.set("market", params.market);
  if (params.utmSource) query.set("utm_source", params.utmSource);
  if (params.utmMedium) query.set("utm_medium", params.utmMedium);
  if (params.utmCampaign) query.set("utm_campaign", params.utmCampaign);
  if (params.utmContent) query.set("utm_content", params.utmContent);
  return `/?${query.toString()}`;
}

export function buildCampaignSignupAbsoluteUrl(
  params: SignupCampaignParams = {},
): string {
  return absoluteUrl(buildCampaignSignupPath(params));
}

/** Friendly gym label for /invite landing copy. */
export function formatGymLabel(gymSlug: string | null | undefined): string | null {
  if (!gymSlug) return null;
  const known: Record<string, string> = {
    reds: "Red's",
    "anytime-lafayette": "Anytime Fitness Lafayette",
    "planet-fitness-lafayette": "Planet Fitness Lafayette",
    "lafayette-athletic": "Lafayette Athletic Club",
  };
  if (known[gymSlug]) return known[gymSlug];
  return gymSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
