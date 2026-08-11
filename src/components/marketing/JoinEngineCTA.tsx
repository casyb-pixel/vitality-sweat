import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import { marketSignupCopy } from "@/lib/markets/metros";
import type { MetroId } from "@/lib/markets/metros";

type JoinEngineCTAProps = {
  location: string;
  variant?: "mid" | "end" | "strip";
  market?: MetroId | null;
};

/**
 * Soft SWLA-local invite into the free Vitality Engine — charcoal/orange system.
 * Optional `market` localizes copy ("Train with us in Lafayette…").
 */
export default function JoinEngineCTA({
  location,
  variant = "end",
  market = null,
}: JoinEngineCTAProps) {
  const isStrip = variant === "strip";
  const isMid = variant === "mid";
  const copy = marketSignupCopy(market);
  const campaign = market
    ? {
        market,
        utmSource: "join_cta",
        utmMedium: "site",
        utmCampaign: `market_${market}`,
      }
    : undefined;

  return (
    <aside
      className={
        isStrip
          ? "border border-brand-ink/10 bg-surface-elevated px-5 py-6 sm:px-7 sm:py-7"
          : isMid
            ? "my-10 border-y border-brand-ink/10 bg-surface-elevated px-5 py-8 sm:px-7"
            : "border border-brand-ink/10 bg-brand-ink px-5 py-8 text-white sm:px-8 sm:py-10"
      }
    >
      <p
        className={`eyebrow ${isStrip || isMid ? "text-brand-orange" : "text-brand-orange"}`}
      >
        Vitality Sweat · Free app
      </p>
      <h2
        className={`mt-3 font-display leading-[1.1] text-balance ${
          isStrip || isMid
            ? "text-[clamp(1.5rem,3vw,2rem)] text-brand-ink"
            : "text-[clamp(1.75rem,3.5vw,2.35rem)] text-white"
        }`}
      >
        {isMid ? copy.trainWithUs : "Bring the Chronicles into your week."}
      </h2>
      <p
        className={`mt-3 max-w-xl font-sans text-sm leading-relaxed sm:text-base ${
          isStrip || isMid ? "text-brand-muted" : "text-white/85"
        }`}
      >
        {isMid
          ? copy.heroSupport
          : `${copy.heroSupport} Join free in the Vitality Engine - log sessions, plan meals, and share a grocery list with whoever shops.`}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SignupCtaLink
          location={location}
          label="Create free account"
          campaign={campaign}
          className={
            isStrip || isMid
              ? "inline-flex items-center justify-center bg-brand-orange px-6 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
              : "inline-flex items-center justify-center bg-brand-orange px-6 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
          }
        >
          Create free account
        </SignupCtaLink>
        <SignupCtaLink
          location={`${location}_secondary`}
          label="Launch App"
          campaign={campaign}
          className={
            isStrip || isMid
              ? "inline-flex items-center justify-center border border-brand-ink/20 px-6 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange"
              : "inline-flex items-center justify-center border border-white/35 px-6 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:border-white hover:bg-white/10"
          }
        >
          Launch App
        </SignupCtaLink>
      </div>
    </aside>
  );
}
