/**
 * Phase 1b: 90-day beachhead Growth Campaign templates for Creator Studio.
 * Each template seeds Blog/Video wizards and always implies Phase 0d growth packaging.
 * Never use em dashes in captions or outlines (see humanize-copy.ts).
 */

import {
  buildCampaignSignupAbsoluteUrl,
  type SignupCampaignParams,
} from "@/lib/marketing/campaign-attribution";

export type GrowthCampaignTemplateId =
  | "weekly_challenge"
  | "gym_qr"
  | "grocery_share_contest";

export type BlogArticleType = "standard" | "local_growth";

export type VideoScriptPreset = "standard" | "app_invite";

export type GrowthCampaignTemplate = {
  id: GrowthCampaignTemplateId;
  title: string;
  blurb: string;
  cadenceHint: string;
  /** Prefill Blog Wizard notes + force Local growth article type. */
  chroniclesOutline: string;
  socialCaptions: {
    facebook: string;
    instagram: string;
    x: string;
  };
  /** Default campaign params for in-app CTA links. */
  defaultCta: SignupCampaignParams;
  /** Prefer opening Blog Wizard with Local growth. */
  launchBlog: boolean;
  /** Prefer opening Video Studio with App invite script. */
  launchVideo: boolean;
};

const ENGINE_PITCH =
  "Free Vitality Engine: workouts, meal plans, grocery lists for SWLA.";

export const GROWTH_CAMPAIGN_TEMPLATES: GrowthCampaignTemplate[] = [
  {
    id: "weekly_challenge",
    title: "Weekly challenge post",
    blurb:
      "One local challenge per week: Chronicles outline, social captions, and a tracked Engine CTA.",
    cadenceHint: "Ship every Monday for the 90-day beachhead.",
    chroniclesOutline: [
      "ARTICLE TYPE: Local growth (SWLA fitness challenge)",
      "",
      "Weekly challenge theme: [name the challenge, e.g. 3 honest workouts + 1 meal rating]",
      "Who it's for: Acadiana / Lafayette gym crowd, busy parents, high school athletes",
      "Rules in 3 bullets:",
      "- [rule 1]",
      "- [rule 2]",
      "- [rule 3]",
      "How to log it in the free Vitality Engine (workout tracker + meal plan)",
      "Soft shoutout: invite a training partner with your profile invite link",
      "Close with free Engine CTA (growth packaging will append AdSlot + Join CTA)",
    ].join("\n"),
    socialCaptions: {
      facebook: [
        "This week's Vitality Sweat challenge is live for SWLA.",
        "",
        "Show up 3x, log it in the free Vitality Engine, tag a training partner.",
        "",
        ENGINE_PITCH,
      ].join("\n"),
      instagram: [
        "Weekly challenge · SWLA edition 💪",
        "",
        "3 honest sessions. 1 meal you actually rate. Free app to track it.",
        "",
        "Link in bio → create free account",
        "#VitalitySweat #Sweatlife #SWLA #LafayetteLA",
      ].join("\n"),
      x: [
        "SWLA weekly challenge is up. Log workouts + meals free in Vitality Engine.",
        "Train. Fuel. Compete.",
      ].join("\n"),
    },
    defaultCta: {
      src: "campaign",
      utmSource: "social",
      utmMedium: "organic",
      utmCampaign: "weekly_challenge",
      nextPath: "/app",
    },
    launchBlog: true,
    launchVideo: true,
  },
  {
    id: "gym_qr",
    title: "Gym QR landing blurb",
    blurb:
      "Front-desk / mirror QR copy that lands on /invite?src=gym&gym=… for sponsor attribution.",
    cadenceHint: "Print once per partner gym; refresh copy monthly.",
    chroniclesOutline: [
      "ARTICLE TYPE: Local growth (gym tracking habits)",
      "",
      "Partner gym: [Red's / Anytime / etc. Set gym= slug on CTA]",
      "Hook: Why logging beats guessing between sessions",
      "3 gym-floor habits that stick in Lafayette heat / humidity",
      "How the free Vitality Engine replaces the notes app",
      "QR path: scan → /invite?src=gym&gym=[slug] → free signup",
      "Mention the gym by name once (sponsor-friendly, not salesy)",
      "Growth packaging: Engine CTA + mid AdSlot on publish",
    ].join("\n"),
    socialCaptions: {
      facebook: [
        "Training at [Gym Name]? Scan the Vitality Sweat QR at the front desk.",
        "",
        "Free account → track workouts + meals built for how SWLA trains.",
        "",
        ENGINE_PITCH,
      ].join("\n"),
      instagram: [
        "Gym floor → free app in 30 seconds.",
        "Scan the QR. Log the work. Invite your lift partner.",
        "",
        "#VitalitySweat #SWLA #GymLife",
      ].join("\n"),
      x: [
        "Gym QR → free Vitality Engine. Workouts + meal plans for SWLA athletes.",
      ].join("\n"),
    },
    defaultCta: {
      src: "gym",
      gym: "reds",
      utmSource: "gym_qr",
      utmMedium: "offline",
      utmCampaign: "gym_partner",
      utmContent: "front_desk",
      nextPath: "/app",
    },
    launchBlog: true,
    launchVideo: false,
  },
  {
    id: "grocery_share_contest",
    title: "Grocery-list share contest",
    blurb:
      "Household share loop: Rouses-run meal prep Chronicle + contest captions + Engine CTA.",
    cadenceHint: "Run biweekly; lean on shareable grocery links.",
    chroniclesOutline: [
      "ARTICLE TYPE: Local growth (meal prep for a Rouses run)",
      "",
      "Contest: Share your Vitality Engine grocery list with whoever shops",
      "Prize / shoutout: soft profile badge energy for brought friends / crew builder (no paid credits)",
      "SWLA angle: Rouses / local grocery aisles, athlete meals that survive the week",
      "How to: build plan in Engine → Share list → spouse opens /grocery/[token] without login",
      "CTA: create free account, then invite a friend with your invite link",
      "Growth packaging appends Join Engine CTA + AdSlot on publish",
    ].join("\n"),
    socialCaptions: {
      facebook: [
        "Contest: share your Vitality Engine grocery list with your household this week.",
        "",
        "Built for a real Rouses run: free meal plans in the Engine.",
        "",
        ENGINE_PITCH,
      ].join("\n"),
      instagram: [
        "Grocery list share contest 🛒",
        "Plan in the free app → send the link → they shop, you train.",
        "",
        "#VitalitySweat #MealPrep #SWLA #Rouses",
      ].join("\n"),
      x: [
        "Share your free Vitality Engine grocery list this week. SWLA meal prep without the group-chat chaos.",
      ].join("\n"),
    },
    defaultCta: {
      src: "campaign",
      utmSource: "social",
      utmMedium: "organic",
      utmCampaign: "grocery_share_contest",
      nextPath: "/app",
    },
    launchBlog: true,
    launchVideo: true,
  },
];

export function getGrowthCampaignTemplate(
  id: GrowthCampaignTemplateId,
): GrowthCampaignTemplate | undefined {
  return GROWTH_CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}

export function campaignCtaAbsoluteUrl(
  template: GrowthCampaignTemplate,
  overrides?: Partial<SignupCampaignParams>,
): string {
  return buildCampaignSignupAbsoluteUrl({
    ...template.defaultCta,
    ...overrides,
  });
}

/** Public invite landing for gym QR prints. */
export function buildGymInvitePath(
  gymSlug: string,
  market?: string | null,
): string {
  const gym = gymSlug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const qs = new URLSearchParams({
    src: "gym",
    gym: gym || "partner",
    utm_source: "gym_qr",
    utm_medium: "offline",
    utm_campaign: "gym_partner",
  });
  if (market) qs.set("market", market);
  return `/invite?${qs.toString()}`;
}

export const LOCAL_GROWTH_ARTICLE_SEED = [
  "ARTICLE TYPE: Local growth",
  "",
  "Pick one SWLA angle:",
  "- Fitness habits that work in Lafayette / Acadiana gyms",
  "- Meal prep built for a Rouses run (aisles, leftovers, athlete fuel)",
  "- Gym tracking habits that beat the notes app",
  "",
  "Include: one practical tip, local framing (not touristy), free Vitality Engine CTA.",
  "On publish: growth packaging auto-inserts mid AdSlot + Engine signup CTA.",
].join("\n");

export const APP_INVITE_SCRIPT_GUIDANCE = [
  "SCRIPT PRESET: App invite (hook → tip → free app CTA)",
  "Hook (0-2s): pattern interrupt / curiosity",
  "Tip (2-20s): one actionable training or meal tip",
  "CTA (last 5s): Create a free Vitality Engine account: workouts + meal plans for SWLA",
].join("\n");
