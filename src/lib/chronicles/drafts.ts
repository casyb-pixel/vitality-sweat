/**
 * Sweatlife Chronicles draft stubs for Creator Studio recommendations.
 * Swap this module for a Supabase `chronicles_posts` query when the CMS is live.
 */

export type ChronicleDraft = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "review" | "published";
  excerpt: string;
  tags: string[];
  updatedAt: string;
};

export type VideoRecommendation = {
  id: string;
  draftId: string;
  draftTitle: string;
  suggestedFormat: "reel" | "short" | "story" | "carousel-broll";
  hook: string;
  workoutCue: string;
  platforms: ("instagram" | "tiktok" | "youtube" | "facebook")[];
  confidence: number;
};

export const CHRONICLE_DRAFTS: ChronicleDraft[] = [
  {
    id: "draft-cardio-consistency",
    title: "Why 5× Cardio Beats One Hero Session",
    slug: "five-times-cardio-consistency",
    status: "draft",
    excerpt:
      "Consistency compounds. A practical week of sweaty minutes over weekend burnout.",
    tags: ["cardio", "habits", "training"],
    updatedAt: "2026-07-18T14:20:00.000Z",
  },
  {
    id: "draft-youth-pitching",
    title: "Youth Pitching Mechanics Without Overcoaching",
    slug: "youth-pitching-mechanics",
    status: "review",
    excerpt:
      "Cues that stick for Southwest Louisiana arms — balance, timing, and intent.",
    tags: ["baseball", "youth", "mechanics"],
    updatedAt: "2026-07-17T09:05:00.000Z",
  },
  {
    id: "draft-fuel-bowl",
    title: "Post-Lift Bowls That Actually Travel",
    slug: "post-lift-bowls",
    status: "draft",
    excerpt:
      "Heart-healthy plates you can pack after gym or practice without losing energy.",
    tags: ["nutrition", "recovery", "meal-prep"],
    updatedAt: "2026-07-16T18:40:00.000Z",
  },
];

export function buildRecommendationsFromDrafts(
  drafts: ChronicleDraft[] = CHRONICLE_DRAFTS,
): VideoRecommendation[] {
  return drafts
    .filter((d) => d.status !== "published")
    .map((draft, index) => {
      const primaryTag = draft.tags[0] ?? "training";
      const format =
        primaryTag === "nutrition"
          ? "carousel-broll"
          : primaryTag === "baseball"
            ? "short"
            : index % 2 === 0
              ? "reel"
              : "story";

      return {
        id: `rec-${draft.id}`,
        draftId: draft.id,
        draftTitle: draft.title,
        suggestedFormat: format,
        hook: `Hook from “${draft.title}”: open on motion, land the takeaway in 3 seconds.`,
        workoutCue:
          primaryTag === "nutrition"
            ? "Film a 20s prep → plate → bite sequence; overlay calorie-smart caption."
            : primaryTag === "baseball"
              ? "Capture 2–3 cue drills (balance → stride → finish) at field pace."
              : "Film a sweaty interval clip that mirrors the post’s weekly cadence.",
        platforms:
          format === "short"
            ? ["youtube", "tiktok", "instagram"]
            : ["instagram", "tiktok", "facebook"],
        confidence: 0.72 + (draft.status === "review" ? 0.12 : 0),
      } satisfies VideoRecommendation;
    });
}
