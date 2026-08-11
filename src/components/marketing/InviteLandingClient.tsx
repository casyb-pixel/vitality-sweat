"use client";

import { useEffect } from "react";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import { trackInviteLandingView } from "@/lib/analytics/ga";
import {
  formatGymLabel,
  rememberCampaignAttribution,
  type SignupCampaignParams,
} from "@/lib/marketing/campaign-attribution";
import { marketSignupCopy, normalizeMarketParam } from "@/lib/markets/metros";
import {
  normalizeReferralCode,
  rememberReferralCode,
} from "@/lib/referrals/codes";

type InviteLandingClientProps = {
  src: string | null;
  gym: string | null;
  market: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  refCode: string | null;
};

export default function InviteLandingClient({
  src,
  gym,
  market: marketRaw,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  refCode,
}: InviteLandingClientProps) {
  const gymLabel = formatGymLabel(gym);
  const isGym = (src ?? "").toLowerCase() === "gym" || Boolean(gym);
  const market = normalizeMarketParam(marketRaw);
  const copy = marketSignupCopy(market);

  useEffect(() => {
    rememberCampaignAttribution({
      src,
      gym,
      market: marketRaw,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
    });
    const code = normalizeReferralCode(refCode);
    if (code) rememberReferralCode(code);
    trackInviteLandingView(src ?? undefined, gym ?? undefined);
  }, [
    src,
    gym,
    marketRaw,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    refCode,
  ]);

  const campaign: SignupCampaignParams = {
    src: src ?? (isGym ? "gym" : "invite"),
    gym,
    market,
    utmSource: utmSource ?? (isGym ? "gym_qr" : "invite"),
    utmMedium: utmMedium ?? (isGym ? "offline" : "landing"),
    utmCampaign:
      utmCampaign ??
      (market
        ? `market_${market}`
        : isGym
          ? "gym_partner"
          : "invite_page"),
    utmContent,
    ref: normalizeReferralCode(refCode) ?? undefined,
    nextPath: "/app",
  };

  return (
    <div className="section-y site-shell max-w-2xl">
      <p className="eyebrow text-brand-orange">
        {isGym && gymLabel
          ? `${gymLabel} · Partner invite`
          : market
            ? `${copy.shortLabel} · Vitality Sweat`
            : "Vitality Sweat"}
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.4rem)] leading-[1.05] text-brand-ink">
        Train. Fuel. Compete. - free.
      </h1>
      <p className="mt-4 font-sans text-base leading-relaxed text-brand-muted sm:text-lg">
        {isGym && gymLabel
          ? `You're one scan away from Vitality Sweat - free workouts, meal plans, and grocery lists in the Vitality Engine, built for how Southwest Louisiana trains. Thanks for training with ${gymLabel}.`
          : market
            ? `${copy.heroSupport} ${copy.trainWithUs}.`
            : "Create a free Vitality Sweat account for workouts, meal plans, and shareable grocery lists in the Vitality Engine - built for Acadiana / SWLA."}
      </p>

      <ul className="mt-8 space-y-3 font-sans text-sm text-brand-ink">
        <li className="flex gap-2">
          <span className="text-brand-orange" aria-hidden>
            →
          </span>
          Log sessions without losing the notebook
        </li>
        <li className="flex gap-2">
          <span className="text-brand-orange" aria-hidden>
            →
          </span>
          Meal plans that survive a real grocery run
        </li>
        <li className="flex gap-2">
          <span className="text-brand-orange" aria-hidden>
            →
          </span>
          Invite friends - soft shoutouts, no paywall
        </li>
      </ul>

      <SignupCtaLink
        location={isGym ? "invite_gym" : "invite_page"}
        label="Create free account"
        href={undefined}
        campaign={campaign}
        className="mt-8 inline-flex min-h-12 items-center justify-center bg-brand-orange px-6 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
      >
        Create free account
      </SignupCtaLink>

      <p className="mt-4 font-sans text-xs text-brand-muted">
        Free forever for members. Campaign tags ({src || "invite"}
        {gym ? ` · ${gym}` : ""}
        {market ? ` · ${market}` : ""}) are stored for sponsor attribution after
        signup.
      </p>
    </div>
  );
}
