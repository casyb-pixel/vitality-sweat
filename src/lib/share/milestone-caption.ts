import { buildCampaignSignupAbsoluteUrl } from "@/lib/marketing/campaign-attribution";
import type { WorkoutMilestone } from "@/lib/fitness/milestones";
import { stripEmDashes } from "@/lib/text/humanize-copy";

export const MILESTONE_LOGO_PATH =
  "/branding/logo-original-transparent.png";

export type MilestoneShareCard = {
  headline: string;
  detail: string;
  brand: string;
  logoPath: string;
};

export type MilestoneSharePayload = {
  caption: string;
  shareUrl: string;
  card: MilestoneShareCard;
};

/** Soft CTA caption for member shares. No medical claims. */
export function buildMilestoneCaption(
  milestone: Pick<WorkoutMilestone, "type" | "title" | "detail">,
  shareUrl: string,
): string {
  const lines =
    milestone.type === "personal_best"
      ? [
          milestone.title,
          milestone.detail,
          "",
          "Training in Vitality Engine. Join free:",
          shareUrl,
        ]
      : [
          milestone.title,
          milestone.detail,
          "",
          "Tracking progress in Vitality Engine. Join free:",
          shareUrl,
        ];
  return stripEmDashes(lines.join("\n"));
}

export function buildMemberShareUrl(referralCode?: string | null): string {
  return buildCampaignSignupAbsoluteUrl({
    utmSource: "member_share",
    utmMedium: "social",
    utmCampaign: "milestone",
    ref: referralCode ?? undefined,
    nextPath: "/app",
  });
}

export function buildMilestoneShareCard(
  milestone: Pick<WorkoutMilestone, "title" | "detail">,
): MilestoneShareCard {
  return {
    headline: stripEmDashes(milestone.title),
    detail: stripEmDashes(milestone.detail),
    brand: "Vitality Engine",
    logoPath: MILESTONE_LOGO_PATH,
  };
}

export function buildMilestoneSharePayload(
  milestone: Pick<WorkoutMilestone, "type" | "title" | "detail">,
  referralCode?: string | null,
): MilestoneSharePayload {
  const shareUrl = buildMemberShareUrl(referralCode);
  return {
    caption: buildMilestoneCaption(milestone, shareUrl),
    shareUrl,
    card: buildMilestoneShareCard(milestone),
  };
}
