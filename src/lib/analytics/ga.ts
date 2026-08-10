import { GA_MEASUREMENT_ID } from "@/lib/seo/site";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export type GaGrowthEvent =
  | "signup_start"
  | "signup_complete"
  | "cta_click"
  | "grocery_share_view";

type GaEventParams = Record<string, string | number | boolean | undefined>;

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

export function trackGroceryShareView(): void {
  trackGaEvent("grocery_share_view");
}

/** Public signup deep-link used across marketing CTAs. */
export function signupHref(nextPath = "/app"): string {
  const next = encodeURIComponent(nextPath);
  return `/?auth=signup&next=${next}`;
}
