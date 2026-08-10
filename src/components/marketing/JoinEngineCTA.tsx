import SignupCtaLink from "@/components/marketing/SignupCtaLink";

type JoinEngineCTAProps = {
  location: string;
  variant?: "mid" | "end" | "strip";
};

/**
 * Soft SWLA-local invite into the free Vitality Engine — charcoal/orange system.
 */
export default function JoinEngineCTA({
  location,
  variant = "end",
}: JoinEngineCTAProps) {
  const isStrip = variant === "strip";
  const isMid = variant === "mid";

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
        Vitality Engine · Free
      </p>
      <h2
        className={`mt-3 font-display leading-[1.1] text-balance ${
          isStrip || isMid
            ? "text-[clamp(1.5rem,3vw,2rem)] text-brand-ink"
            : "text-[clamp(1.75rem,3.5vw,2.35rem)] text-white"
        }`}
      >
        {isMid
          ? "Train. Fuel. Compete. — from Acadiana to the gym floor."
          : "Bring the Chronicles into your week."}
      </h2>
      <p
        className={`mt-3 max-w-xl font-sans text-sm leading-relaxed sm:text-base ${
          isStrip || isMid ? "text-brand-muted" : "text-white/85"
        }`}
      >
        {isMid
          ? "Create a free Vitality Engine account for workouts, meal plans, and grocery lists built for how Southwest Louisiana actually trains and eats."
          : "Join free — log sessions, plan meals, and share a grocery list with whoever shops for your household. Hunter’s coaching, close to home."}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SignupCtaLink
          location={location}
          label="Create free account"
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
          href="/?auth=signup&next=/app"
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
