import { SITE_URL } from "@/lib/seo/site";

/**
 * Origin used for Supabase auth email redirects.
 * Prefer the current browser origin (local + preview), but never fall back
 * to an empty string — production emails must land on the live site.
 */
export function getAuthEmailRedirectOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, "");
    // Guard against accidental auth links to a dead local server when the
    // app is opened via an IP or unusual host during production testing.
    if (
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("vitalitysweat.com") ||
      origin.includes("vercel.app")
    ) {
      return origin;
    }
  }
  return SITE_URL;
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const origin = getAuthEmailRedirectOrigin();
  const next = encodeURIComponent(nextPath);
  return `${origin}/auth/callback?next=${next}`;
}
