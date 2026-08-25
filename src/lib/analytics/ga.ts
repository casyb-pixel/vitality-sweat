import { GA_MEASUREMENT_ID } from "@/lib/seo/site";
import {
  buildCampaignSignupPath,
  type SignupCampaignParams,
} from "@/lib/marketing/campaign-attribution";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** Vitality Sweat GA4 account / property (Admin → Account / Property settings). */
export const GA4_ACCOUNT_ID = "320133133";
export const GA4_PROPERTY_ID = "448390395";

/**
 * Mark these as Key events in GA4 Admin → Data display → Events.
 * Also link Google Ads (552-125-8444) to this property under Admin → Google Ads links.
 */
export const GA4_KEY_EVENTS = [
  "signup_complete",
  "onboarding_complete",
  "generate_lead",
  "purchase",
] as const;

/** Register as event-scoped custom dimensions in GA4 Admin → Custom definitions. */
export const GA4_CUSTOM_DIMENSIONS = [
  { param: "cta_location", uiName: "CTA location" },
  { param: "method", uiName: "Auth method" },
  { param: "campaign_src", uiName: "Campaign source" },
  { param: "campaign_gym", uiName: "Campaign gym" },
  { param: "package_id", uiName: "Advertise package" },
  { param: "market", uiName: "Market" },
] as const;

export type GaGrowthEvent =
  | "signup_start"
  | "signup_complete"
  | "cta_click"
  | "grocery_share_view"
  | "invite_landing_view"
  | "share_milestone_intent"
  | "share_milestone_complete"
  | "generate_lead"
  | "onboarding_complete"
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase";

type GaEventParams = Record<string, string | number | boolean | undefined | object>;

export type GaEcommerceItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
};

/** Safe GA4 event helper — no-ops when gtag or measurement ID is missing. */
export function trackGaEvent(
  event: GaGrowthEvent | (string & {}),
  params?: GaEventParams,
): void {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", event, params);
}

export function trackCtaClick(location: string, label?: string): void {
  trackGaEvent("cta_click", {
    cta_location: location,
    cta_label: label,
  });
}

export function trackSignupStart(method?: string): void {
  trackGaEvent("signup_start", {
    method: method ?? "modal",
  });
}

export function trackSignupComplete(method?: string): void {
  trackGaEvent("signup_complete", {
    method: method ?? "unknown",
  });
}

export function trackOnboardingComplete(): void {
  trackGaEvent("onboarding_complete");
}

export function trackGenerateLead(params?: {
  package_id?: string;
  market?: string;
  currency?: string;
  value?: number;
}): void {
  trackGaEvent("generate_lead", {
    currency: params?.currency ?? "USD",
    value: params?.value ?? 0,
    package_id: params?.package_id,
    market: params?.market,
  });
}

export function trackGroceryShareView(): void {
  trackGaEvent("grocery_share_view");
}

export function trackInviteLandingView(src?: string, gym?: string): void {
  trackGaEvent("invite_landing_view", {
    campaign_src: src,
    campaign_gym: gym,
  });
}

export function trackShareMilestoneIntent(milestoneType: string): void {
  trackGaEvent("share_milestone_intent", {
    milestone_type: milestoneType,
  });
}

export function trackShareMilestoneComplete(
  milestoneType: string,
  method: "web_share" | "download" | "copy_caption",
): void {
  trackGaEvent("share_milestone_complete", {
    milestone_type: milestoneType,
    share_method: method,
  });
}

function moneyNumber(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function trackViewItem(input: {
  currency: string;
  value: string | number;
  items: GaEcommerceItem[];
}): void {
  trackGaEvent("view_item", {
    currency: input.currency,
    value: moneyNumber(input.value),
    items: input.items,
  });
}

export function trackAddToCart(input: {
  currency: string;
  value: string | number;
  items: GaEcommerceItem[];
}): void {
  trackGaEvent("add_to_cart", {
    currency: input.currency,
    value: moneyNumber(input.value),
    items: input.items,
  });
}

export function trackBeginCheckout(input: {
  currency: string;
  value: string | number;
  items: GaEcommerceItem[];
}): void {
  trackGaEvent("begin_checkout", {
    currency: input.currency,
    value: moneyNumber(input.value),
    items: input.items,
  });
}

export function trackPurchase(input: {
  transaction_id: string;
  currency: string;
  value: string | number;
  items: GaEcommerceItem[];
}): void {
  trackGaEvent("purchase", {
    transaction_id: input.transaction_id,
    currency: input.currency,
    value: moneyNumber(input.value),
    items: input.items,
  });
}

/** Public signup deep-link used across marketing CTAs. */
export function signupHref(
  nextPath = "/app",
  campaign?: SignupCampaignParams,
): string {
  if (campaign) {
    return buildCampaignSignupPath({ ...campaign, nextPath });
  }
  const next = encodeURIComponent(nextPath);
  return `/?auth=signup&next=${next}`;
}
