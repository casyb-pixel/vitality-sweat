/**
 * Phase 2 stub: OAuth publish to X / Facebook.
 *
 * Phase 1 ships Web Share API + branded image download/copy only.
 * Do NOT claim silent auto-posting from the web, and do not call these
 * helpers from the Celebrate sheet until OAuth + publish APIs exist.
 *
 * Planned hooks (later):
 * - Store per-user OAuth tokens in a private table with RLS (user owns row)
 * - refreshTokenIfNeeded(provider)
 * - publishMilestoneToX({ caption, imageUrl })
 * - publishMilestoneToFacebook({ caption, imageUrl, pageId })
 * - Feature flag: NEXT_PUBLIC_SOCIAL_OAUTH_PUBLISH=1
 *
 * Product rules that stay:
 * - User must confirm before any post
 * - Soft CTA captions only; no medical claims; no em dashes
 * - Official Vitality Sweat logo on every graphic
 */

export type SocialPublishProvider = "x" | "facebook";

export type SocialPublishInput = {
  caption: string;
  /** Short-lived public or signed URL to the share graphic. */
  imageUrl?: string | null;
  milestoneType?: string;
};

export function isOAuthPublishEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SOCIAL_OAUTH_PUBLISH === "1";
}

export async function publishMilestoneToX(
  _input: SocialPublishInput,
): Promise<never> {
  throw new Error(
    "X OAuth publish is Phase 2. Use Web Share or download in Phase 1.",
  );
}

export async function publishMilestoneToFacebook(
  _input: SocialPublishInput,
): Promise<never> {
  throw new Error(
    "Facebook OAuth publish is Phase 2. Use Web Share or download in Phase 1.",
  );
}
