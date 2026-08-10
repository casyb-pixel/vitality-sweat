import { signupHref } from "@/lib/analytics/ga";
import { absoluteUrl } from "@/lib/seo/site";

/** Marker so we never double-append the standard Chronicles end CTA. */
export const GROWTH_CTA_MARKER = "<!-- vitality-growth-cta -->";

export type PostGrowthPackaging = {
  ctaEnabled: boolean;
  adSlotMid: string;
  appliedAt: string;
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
  generatedAt: string;
};

/** Mid-article AdSlot id derived from post slug (no AdSense ID required). */
export function blogMidAdSlotId(slug: string): string {
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return `blog-mid-${clean || "post"}`;
}

export function groceryAdSlotId(tokenPrefix = "share"): string {
  return `grocery-${tokenPrefix}`;
}

export function freeSignupAbsoluteUrl(): string {
  return absoluteUrl(signupHref("/app"));
}

/**
 * Standard end-of-Chronicle CTA (markdown). Page-level JoinEngineCTA still
 * renders; this keeps the CTA inside SEO body/markdown as well.
 */
export function standardBlogGrowthCtaMarkdown(): string {
  const joinUrl = freeSignupAbsoluteUrl();
  return [
    GROWTH_CTA_MARKER,
    "",
    "## Ready to train with purpose?",
    "",
    "Create a **free Vitality Engine** account to track workouts, build meal plans, and share grocery lists — built for how Southwest Louisiana actually trains and eats.",
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
  opts: { includeCta: boolean },
): string {
  const body = bodyMarkdown.trimEnd();
  if (!opts.includeCta) return body;
  if (body.includes(GROWTH_CTA_MARKER)) return body;
  return `${body}\n\n${standardBlogGrowthCtaMarkdown()}`;
}

export function buildPostGrowthPackaging(
  slug: string,
  includeCta: boolean,
): PostGrowthPackaging {
  return {
    ctaEnabled: includeCta,
    adSlotMid: blogMidAdSlotId(slug),
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Deterministic growth promo pack layered on top of AI social captions.
 * Always includes free signup CTA + SWLA angle for local ad sales.
 */
export function buildVideoGrowthPromoPack(input: {
  blogTitle: string;
  conceptTitle: string;
  baseCaption?: string;
  baseDescription?: string;
}): VideoGrowthPromoPack {
  const signupUrl = freeSignupAbsoluteUrl();
  const hook =
    input.baseCaption?.trim().split("\n")[0]?.slice(0, 120) ||
    input.conceptTitle;
  const blogBit = input.blogTitle.trim();

  return {
    captionVariants: {
      instagram: [
        hook,
        "",
        "Training in Acadiana / SWLA? Grab a free Vitality Engine account — workouts, meal plans, grocery lists.",
        "",
        `Create free → ${signupUrl}`,
        "",
        "#VitalitySweat #Sweatlife #SWLA",
      ].join("\n"),
      facebook: [
        `${blogBit ? `From the Sweatlife Chronicles: ${blogBit}` : "New from Vitality Sweat."}`,
        "",
        "Hunter’s coaching is free to start in the Vitality Engine — log sessions, plan meals, share the grocery list with whoever shops.",
        "",
        `Create your free account: ${signupUrl}`,
      ].join("\n"),
      youtubeShorts: [
        `${hook} #VitalitySweat #Shorts`,
        "",
        `Free Vitality Engine for SWLA athletes → ${signupUrl}`,
      ].join("\n"),
    },
    pinnedComment: `Free Vitality Engine account (workouts + meal plans): ${signupUrl} — Train. Fuel. Compete.`,
    descriptionWithAppLink: [
      input.baseDescription?.trim() ||
        `${input.conceptTitle} — Vitality Sweat / Sweatlife Chronicles.`,
      "",
      `Create a free Vitality Engine account: ${signupUrl}`,
      "Train. Fuel. Compete. — Southwest Louisiana.",
    ].join("\n"),
    companionPostTitle: blogBit
      ? `${blogBit}: what to do next in the free app`
      : `After this clip: your free Vitality Engine next step`,
    companionPostPrompt: [
      `Write a short Sweatlife Chronicle companion to the short-form video "${input.conceptTitle}".`,
      blogBit ? `Parent / related post: ${blogBit}.` : null,
      "Include: 1 practical training or nutrition takeaway, SWLA/local framing without sounding salesy, and a clear CTA to create a free Vitality Engine account for workouts + meal plans.",
      "Tone: Hunter Broussard — real gym energy, Train. Fuel. Compete.",
    ]
      .filter(Boolean)
      .join("\n"),
    signupUrl,
    generatedAt: new Date().toISOString(),
  };
}
