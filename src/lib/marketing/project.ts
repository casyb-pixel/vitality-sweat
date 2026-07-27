/**
 * 7-Day Marketing Project types for Creator Studio.
 * Checklist columns live on `public.posts` after
 * `20260727195909_posts_marketing_projects.sql`.
 * Video section targeting lives on `public.video_projects`.
 */

import type { BlogSectionOption } from "@/lib/blog/heading-anchor";

export type GeneratedPromos = {
  facebook: string;
  instagram: string;
  x: string;
  blogUrl: string;
  generatedAt: string;
  model?: string;
};

export type MarketingChecklistKey =
  | "fb_post_done"
  | "ig_post_done"
  | "x_post_done"
  | "video_1_done"
  | "video_2_done"
  | "video_3_done";

export type MarketingVideoChecklistKey =
  | "video_1_done"
  | "video_2_done"
  | "video_3_done";

export const MARKETING_CHECKLIST_ITEMS: {
  key: MarketingChecklistKey;
  label: string;
  group: "social" | "video";
  platform: string;
}[] = [
  { key: "fb_post_done", label: "Facebook post", group: "social", platform: "Facebook" },
  { key: "ig_post_done", label: "Instagram post", group: "social", platform: "Instagram" },
  { key: "x_post_done", label: "X post", group: "social", platform: "X" },
  {
    key: "video_1_done",
    label: "Instagram Reel",
    group: "video",
    platform: "Instagram",
  },
  { key: "video_2_done", label: "TikTok video", group: "video", platform: "TikTok" },
  {
    key: "video_3_done",
    label: "YouTube Short",
    group: "video",
    platform: "YouTube",
  },
];

export type MarketingVideoTarget = {
  checklistKey: MarketingVideoChecklistKey;
  videoProjectId: string | null;
  targetSectionAnchor: string | null;
  hasVideo: boolean;
  embedPublished: boolean;
};

export type MarketingProject = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  projectDueAt: string | null;
  isArchived: boolean;
  fbPostDone: boolean;
  igPostDone: boolean;
  xPostDone: boolean;
  video1Done: boolean;
  video2Done: boolean;
  video3Done: boolean;
  generatedPromos: GeneratedPromos | null;
  /** H2/H3 options extracted from the live post body. */
  sectionOptions: BlogSectionOption[];
  /** Per video-checklist section targeting (from video_projects). */
  videoTargets: MarketingVideoTarget[];
};

export function isVideoChecklistKey(
  value: string,
): value is MarketingVideoChecklistKey {
  return (
    value === "video_1_done" ||
    value === "video_2_done" ||
    value === "video_3_done"
  );
}

export function checklistProgress(project: MarketingProject): {
  done: number;
  total: number;
  complete: boolean;
} {
  const flags = [
    project.fbPostDone,
    project.igPostDone,
    project.xPostDone,
    project.video1Done,
    project.video2Done,
    project.video3Done,
  ];
  const done = flags.filter(Boolean).length;
  return { done, total: flags.length, complete: done === flags.length };
}

export function isChecklistKey(value: string): value is MarketingChecklistKey {
  return MARKETING_CHECKLIST_ITEMS.some((item) => item.key === value);
}

export function emptyVideoTargets(): MarketingVideoTarget[] {
  return (
    MARKETING_CHECKLIST_ITEMS.filter((item) => item.group === "video") as {
      key: MarketingVideoChecklistKey;
      label: string;
      group: "video";
      platform: string;
    }[]
  ).map((item) => ({
    checklistKey: item.key,
    videoProjectId: null,
    targetSectionAnchor: null,
    hasVideo: false,
    embedPublished: false,
  }));
}
