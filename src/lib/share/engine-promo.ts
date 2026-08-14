import { buildInviteUrl } from "@/lib/referrals/codes";
import { stripEmDashes } from "@/lib/text/humanize-copy";
import {
  MILESTONE_LOGO_PATH,
  type MilestoneShareCard,
} from "@/lib/share/milestone-caption";

export type EnginePromoVariant = "gym" | "athlete" | "first_week";

export type EnginePromoPack = {
  variant: EnginePromoVariant;
  caption: string;
  shareUrl: string;
  card: MilestoneShareCard;
};

export const ENGINE_PROMO_VARIANTS: {
  id: EnginePromoVariant;
  label: string;
  body: string;
}[] = [
  {
    id: "gym",
    label: "Gym crew",
    body: "Training free in Vitality Engine with the crew. Programs, logging, meals. Join with my link.",
  },
  {
    id: "athlete",
    label: "Athlete",
    body: "Hunter's Engine is free. I am logging lifts and fuel in one place. Jump in:",
  },
  {
    id: "first_week",
    label: "First week",
    body: "Week one in Vitality Engine. Free training app. If you want in:",
  },
];

export function buildEnginePromoCaption(input: {
  variant: EnginePromoVariant;
  shareUrl: string;
  contestLine?: string | null;
}): string {
  const preset =
    ENGINE_PROMO_VARIANTS.find((v) => v.id === input.variant) ??
    ENGINE_PROMO_VARIANTS[0];
  const lines = [preset.body, "", input.shareUrl];
  if (input.contestLine?.trim()) {
    lines.push("", stripEmDashes(input.contestLine.trim()));
  }
  return stripEmDashes(lines.join("\n"));
}

export function buildEnginePromoCard(input: {
  displayName?: string | null;
  referralCode?: string | null;
}): MilestoneShareCard {
  const name = (input.displayName ?? "").trim();
  const code = (input.referralCode ?? "").trim();
  const detail = name
    ? `${name} is training free in Vitality Engine.`
    : "Train. Fuel. Compete. The app is free.";
  return {
    headline: "Train free in Vitality Engine",
    detail: stripEmDashes(
      code ? `${detail} Code ${code}.` : detail,
    ),
    brand: "Vitality Engine",
    logoPath: MILESTONE_LOGO_PATH,
  };
}

export function buildEnginePromoPack(input: {
  variant: EnginePromoVariant;
  referralCode: string;
  displayName?: string | null;
  contestLine?: string | null;
}): EnginePromoPack {
  const shareUrl = buildInviteUrl(input.referralCode);
  return {
    variant: input.variant,
    shareUrl,
    caption: buildEnginePromoCaption({
      variant: input.variant,
      shareUrl,
      contestLine: input.contestLine,
    }),
    card: buildEnginePromoCard({
      displayName: input.displayName,
      referralCode: input.referralCode,
    }),
  };
}
