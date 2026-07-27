/**
 * Site-wide SEO constants for Vitality Sweat / Vitality Engine / Sweatlife Chronicles.
 */
export const SITE_NAME = "Vitality Sweat";
export const SITE_TAGLINE = "Train. Fuel. Compete.";
export const DEFAULT_DESCRIPTION =
  "On-demand fitness training, peak-performance nutrition, and youth baseball lessons from Hunter Broussard in Southwest Louisiana. Read The Sweatlife Chronicles.";

/** Production canonical origin — override with NEXT_PUBLIC_SITE_URL in env. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://vitalitysweat.com"
) as string;

export const DEFAULT_OG_IMAGE = "/images/hero-strength-stamina-collage.png";
export const TWITTER_HANDLE = "@vitalitysweat";

export function absoluteUrl(path = "/"): string {
  const trimmed = (path || "/").trim();
  if (!trimmed) return SITE_URL;
  // Creator Studio covers are already absolute Supabase Storage URLs —
  // never prefix those with the site origin (that produced a 500 in metadata).
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${SITE_URL}${normalized}`;
}

export function buildCanonical(pathname: string): string {
  if (!pathname || pathname === "/") return SITE_URL;
  const clean = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return absoluteUrl(clean.startsWith("/") ? clean : `/${clean}`);
}
