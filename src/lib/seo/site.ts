/**
 * Site-wide SEO constants for Vitality Sweat / Vitality Engine / Sweatlife Chronicles.
 */
export const SITE_NAME = "Vitality Sweat";
export const SITE_TAGLINE = "Train. Fuel. Compete.";
/** Product / editorial names under the Vitality Sweat brand (not alternate orgs). */
export const APP_PRODUCT_NAME = "Vitality Engine";
export const EDITORIAL_NAME = "The Sweatlife Chronicles";
export const SWEATLIFE_SHORT = "Sweatlife";
export const BRAND_ALTERNATE_NAMES = [
  "vitalitysweat",
  "Vitality Engine",
  "Sweatlife",
  "Sweatlife Chronicles",
] as const;
export const FOUNDING_PERSON_NAME = "Hunter Broussard";

/**
 * Canonical brand-entity definition for metadata, schema, GBP, and social bios.
 * Positive definition only: coaching / training / nutrition / youth baseball in SWLA.
 */
export const BRAND_ENTITY_DEFINITION =
  "Vitality Sweat is Hunter Broussard's Southwest Louisiana training, coaching, nutrition, and youth baseball brand. The Vitality Engine is the free member app. Sweatlife Chronicles carries the editorial coaching notes.";

export const BRAND_DISAMBIGUATING_DESCRIPTION =
  "Vitality Sweat is a Southwest Louisiana fitness coaching and youth baseball brand founded by Hunter Broussard, with the Vitality Engine app and Sweatlife Chronicles under the same brand.";

export const DEFAULT_DESCRIPTION =
  "Vitality Sweat is Hunter Broussard's Southwest Louisiana brand for fitness training, peak-performance nutrition, and youth baseball. Open the Vitality Engine app and read Sweatlife Chronicles.";

/** What the organization knows about (schema knowsAbout). */
export const BRAND_KNOWS_ABOUT = [
  "fitness coaching",
  "strength and conditioning",
  "performance nutrition",
  "youth baseball instruction",
  "Southwest Louisiana athlete development",
] as const;

/** Apex production origin used for canonicals, sitemap, robots, and metadataBase. */
export const PRODUCTION_SITE_URL = "https://vitalitysweat.com";

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  // Production deploys must always emit the brand apex, even if env is a
  // preview/www/vercel.app value (that would poison canonicals + sitemap).
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }
  if (!fromEnv) return PRODUCTION_SITE_URL;
  try {
    const parsed = new URL(fromEnv);
    if (parsed.hostname === "www.vitalitysweat.com") {
      return PRODUCTION_SITE_URL;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

/** Canonical site origin — production always apex; local/preview may override. */
export const SITE_URL = resolveSiteUrl();

export const DEFAULT_OG_IMAGE = "/images/hero-strength-stamina-collage.png";
export const TWITTER_HANDLE = "@vitalitysweat";
export const INSTAGRAM_HANDLE = "@vitalitysweat";

/** GA4 web stream Measurement ID — override with NEXT_PUBLIC_GA_MEASUREMENT_ID. */
export const GA_MEASUREMENT_ID = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-V0H33373RB"
) as string;

/** Canonical social profiles — use across footer, nav, and Organization JSON-LD. */
export const SOCIAL_LINKS = [
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCKDlWVX1j1z-05rqZmIqEAA",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/vitalitysweat/",
    handle: INSTAGRAM_HANDLE,
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/vitalitysweat",
    handle: TWITTER_HANDLE,
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61561385332818",
  },
] as const;

export const SOCIAL_PROFILE_URLS = SOCIAL_LINKS.map((link) => link.href);

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
