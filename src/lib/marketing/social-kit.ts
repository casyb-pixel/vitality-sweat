import { signupHref } from "@/lib/analytics/ga";
import {
  absoluteUrl,
  INSTAGRAM_HANDLE,
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_LINKS,
  TIKTOK_HANDLE,
  TWITTER_HANDLE,
} from "@/lib/seo/site";

export type SocialKitPlatform = "instagram" | "tiktok" | "youtube" | "facebook" | "x";

export type SocialKitBio = {
  platform: SocialKitPlatform;
  label: string;
  displayName: string;
  handle: string;
  href: string;
  bio: string;
  extra?: string;
};

export type SocialKitCadenceItem = {
  id: string;
  title: string;
  where: string;
  how: string;
};

function engineInviteUrl(source: SocialKitPlatform): string {
  return absoluteUrl(
    signupHref("/app", {
      utmSource: source,
      utmMedium: "social",
      utmCampaign: "engine_invite",
    }),
  );
}

export const SOCIAL_KIT_LOGOS = [
  {
    label: "Original logo (light surfaces)",
    href: "/branding/logo-original-transparent.png",
  },
  {
    label: "Black logo",
    href: "/branding/logo-black-transparent.svg",
  },
  {
    label: "Instagram profile",
    href: "/branding/social/instagram-profile.png",
  },
  {
    label: "Facebook profile",
    href: "/branding/social/facebook-profile.png",
  },
  {
    label: "Facebook cover",
    href: "/branding/social/facebook-cover.png",
  },
  {
    label: "X profile",
    href: "/branding/social/twitter-profile.png",
  },
  {
    label: "X header",
    href: "/branding/social/twitter-header.png",
  },
  {
    label: "YouTube profile",
    href: "/branding/social/youtube-profile.png",
  },
  {
    label: "YouTube cover",
    href: "/branding/social/youtube-cover.png",
  },
] as const;

export const SOCIAL_KIT_BIOS: SocialKitBio[] = [
  {
    platform: "instagram",
    label: "Instagram",
    displayName: SITE_NAME,
    handle: INSTAGRAM_HANDLE,
    href: "https://www.instagram.com/vitalitysweat/",
    bio: `Hunter Broussard. SWLA training, fuel, youth baseball.\n${SITE_TAGLINE}\nFree Engine below.`,
    extra: "Use the official logo avatar. Remove the EVERY mark and any middle-aged wellness line.",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    displayName: SITE_NAME,
    handle: TIKTOK_HANDLE,
    href: "https://www.tiktok.com/@vitalitysweat",
    bio: `Hunter Broussard. SWLA gym, fuel, youth baseball. ${SITE_TAGLINE} Free Engine in the link.`,
    extra: "Claim @vitalitysweat if it is still open. Same video as Reels and Shorts.",
  },
  {
    platform: "youtube",
    label: "YouTube",
    displayName: SITE_NAME,
    handle: "@vitalitysweat",
    href: SOCIAL_LINKS.find((link) => link.id === "youtube")?.href ?? "https://www.youtube.com/@vitalitysweat",
    bio: `Vitality Sweat is Hunter Broussard's Southwest Louisiana home for training, performance nutrition, and youth baseball. The Vitality Engine is the free member app. ${SITE_TAGLINE}`,
    extra: "Channel is empty until the first Short from Video Studio is uploaded.",
  },
  {
    platform: "facebook",
    label: "Facebook",
    displayName: SITE_NAME,
    handle: "Vitality Sweat",
    href: "https://www.facebook.com/people/Vitality-Sweat/61561385332818/",
    bio: `Hunter Broussard's Southwest Louisiana training, nutrition, and youth baseball brand. Pin the free Engine invite. ${SITE_TAGLINE}`,
    extra: "Keep category Sports and Fitness Instruction. Ask five local people for a review.",
  },
  {
    platform: "x",
    label: "X",
    displayName: SITE_NAME,
    handle: TWITTER_HANDLE,
    href: "https://x.com/vitalitysweat",
    bio: `${SITE_NAME}: Hunter Broussard's SWLA training, fuel, and youth baseball brand. Free Engine app. ${SITE_TAGLINE}`,
    extra: "Display name must be Vitality Sweat, not Casy Broussard. Set the X header graphic.",
  },
];

export const SOCIAL_KIT_UTM_LINKS: {
  platform: SocialKitPlatform;
  label: string;
  url: string;
}[] = [
  { platform: "instagram", label: "Instagram Engine invite", url: engineInviteUrl("instagram") },
  { platform: "tiktok", label: "TikTok Engine invite", url: engineInviteUrl("tiktok") },
  { platform: "youtube", label: "YouTube Engine invite", url: engineInviteUrl("youtube") },
  { platform: "facebook", label: "Facebook Engine invite", url: engineInviteUrl("facebook") },
  { platform: "x", label: "X Engine invite", url: engineInviteUrl("x") },
];

export const SOCIAL_KIT_WEEKLY_CADENCE: SocialKitCadenceItem[] = [
  {
    id: "short",
    title: "1. How-to Short",
    where: "TikTok, Instagram Reels, YouTube Shorts",
    how: "One lift or fuel tip. Same file on all three. Official logo on any graphic. Film in Video Studio, then check the posted boxes.",
  },
  {
    id: "invite",
    title: "2. Engine invite",
    where: "Same video caption or a still with the UTM link",
    how: "Tell people the app is free. Paste the matching UTM link. No medical claims.",
  },
  {
    id: "chronicle",
    title: "3. Chronicle share",
    where: "Facebook and X",
    how: "Link the live post. Do not film a fourth clip. Check Facebook and X on the project.",
  },
];

export const SOCIAL_KIT_RULES = [
  "Hunter on camera. Do not recycle the old Blogger Canva grid.",
  "Official Vitality Sweat logo on every graphic. Black or original on light. White on dark.",
  "No em dashes. No medical claims. Soft CTA only.",
  "School-week cap: three public posts. Same video counts as one film, three uploads.",
  "OAuth auto-post stays off. Copy, post in the native app, then mark done.",
] as const;
