import { signupHref } from "@/lib/analytics/ga";
import {
  buildCampaignSignupAbsoluteUrl,
} from "@/lib/marketing/campaign-attribution";
import { marketSignupCopy } from "@/lib/markets/metros";
import type { MetroId } from "@/lib/markets/metros";
import { absoluteUrl } from "@/lib/seo/site";

/** Marker so we never double-append the standard Chronicles end CTA. */
export const GROWTH_CTA_MARKER = "<!-- vitality-growth-cta -->";

export type PostGrowthPackaging = {
  ctaEnabled: boolean;
  adSlotMid: string;
  appliedAt: string;
  market?: MetroId | null;
};

export type VideoGrowthPromoPack = {
  captionVariants: {
    instagram: string;
    facebook: string;
    youtubeShorts: string;
  };
  pinnedComment: string;
  descriptionWithAppLink: string;
  companionPostTitle: string;
  companionPostPrompt: string;
  signupUrl: string;
  market?: MetroId | null;
  generatedAt: string;
};

/** Mid-article AdSlot id derived from post slug.
 * Inventory resolves `blog-mid-*` → registry slot `blog-inline`
 * so paid/house creatives fill all Chronicles without per-slug flights.
 */
export function blogMidAdSlotId(slug: string): string {
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return `blog-mid-${clean || "post"}`;
}

export function groceryAdSlotId(tokenPrefix = "share"): string {
  return `grocery-${tokenPrefix}`;
}

export function freeSignupAbsoluteUrl(market?: MetroId | null): string {
  if (market) {
    return buildCampaignSignupAbsoluteUrl({
      market,
      utmSource: "growth_packaging",
      utmMedium: "cta",
      utmCampaign: `market_${market}`,
      nextPath: "/app",
    });
  }
  return absoluteUrl(signupHref("/app"));
}

/**
 * Standard end-of-Chronicle CTA (markdown). Page-level JoinEngineCTA still
 * renders; this keeps the CTA inside SEO body/markdown as well.
 */
export function standardBlogGrowthCtaMarkdown(
  market?: MetroId | null,
): string {
  const copy = marketSignupCopy(market);
  const joinUrl = freeSignupAbsoluteUrl(market);
  return [
    GROWTH_CTA_MARKER,
    "",
    `## ${copy.trainWithUs}`,
    "",
    `Create a **free Vitality Engine** account to track workouts, build meal plans, and share grocery lists. ${copy.heroSupport}`,
    "",
    `Join free: ${joinUrl}`,
    "",
    "Train. Fuel. Compete.",
    "",
  ].join("\n");
}

/** Append end CTA unless opted out or already present. Does not strip existing SEO body. */
export function applyBlogGrowthCta(
  bodyMarkdown: string,
  opts: { includeCta: boolean; market?: MetroId | null },
): string {
  const body = bodyMarkdown.trimEnd();
  if (!opts.includeCta) return body;
  if (body.includes(GROWTH_CTA_MARKER)) return body;
  return `${body}\n\n${standardBlogGrowthCtaMarkdown(opts.market)}`;
}

export function buildPostGrowthPackaging(
  slug: string,
  includeCta: boolean,
  market?: MetroId | null,
): PostGrowthPackaging {
  return {
    ctaEnabled: includeCta,
    adSlotMid: blogMidAdSlotId(slug),
    appliedAt: new Date().toISOString(),
    market: market ?? null,
  };
}

/**
 * Deterministic growth promo pack layered on top of AI social captions.
 * Always includes free signup CTA + market/SWLA angle for local ad sales.
 */
export function buildVideoGrowthPromoPack(input: {
  blogTitle: string;
  conceptTitle: string;
  baseCaption?: string;
  baseDescription?: string;
  market?: MetroId | null;
}): VideoGrowthPromoPack {
  const copy = marketSignupCopy(input.market);
  const signupUrl = freeSignupAbsoluteUrl(input.market);
  const hook =
    input.baseCaption?.trim().split("\n")[0]?.slice(0, 120) ||
    input.conceptTitle;
  const blogBit = input.blogTitle.trim();
  const place = copy.shortLabel;

  return {
    captionVariants: {
      instagram: [
        hook,
        "",
        `${copy.trainWithUs}. Grab a free Vitality Engine account - workouts, meal plans, grocery lists.`,
        "",
        `Create free → ${signupUrl}`,
        "",
        `#VitalitySweat #Sweatlife #${place.replace(/\s+/g, "")}`,
      ].join("\n"),
      facebook: [
        `${blogBit ? `From the Sweatlife Chronicles: ${blogBit}` : "New from Vitality Sweat."}`,
        "",
        `${copy.trainWithUs}. Hunter's coaching is free to start in the Vitality Engine - log sessions, plan meals, share the grocery list.`,
        "",
        `Create your free account: ${signupUrl}`,
      ].join("\n"),
      youtubeShorts: [
        `${hook} #VitalitySweat #Shorts`,
        "",
        `Free Vitality Engine for ${place} athletes → ${signupUrl}`,
      ].join("\n"),
    },
    pinnedComment: `Free Vitality Engine (${place}): ${signupUrl} - Train. Fuel. Compete.`,
    descriptionWithAppLink: [
      input.baseDescription?.trim() ||
        `${input.conceptTitle} - Vitality Sweat / Sweatlife Chronicles.`,
      "",
      `${copy.trainWithUs}. Create a free Vitality Engine account: ${signupUrl}`,
      `Train. Fuel. Compete. - ${place}.`,
    ].join("\n"),
    companionPostTitle: blogBit
      ? `${blogBit}: what to do next in the free app (${place})`
      : `After this clip: your free Vitality Engine next step in ${place}`,
    companionPostPrompt: [
      `Write a short Sweatlife Chronicle companion to the short-form video "${input.conceptTitle}".`,
      blogBit ? `Parent / related post: ${blogBit}.` : null,
      `Local market: ${place}. Include: 1 practical training or nutrition takeaway, local framing without sounding salesy, and a clear CTA to create a free Vitality Engine account ("${copy.trainWithUs}").`,
      "Tone: Hunter Broussard - real gym energy, Train. Fuel. Compete.",
    ]
      .filter(Boolean)
      .join("\n"),
    signupUrl,
    market: input.market ?? null,
    generatedAt: new Date().toISOString(),
  };
}
