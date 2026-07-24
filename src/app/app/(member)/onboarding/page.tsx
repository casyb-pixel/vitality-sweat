import type { Metadata } from "next";
import OnboardingForm from "@/components/app/OnboardingForm";
import { requireMemberAccess } from "@/lib/auth/member";

export const metadata: Metadata = {
  title: "Discovery onboarding",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  await requireMemberAccess("/app/onboarding");

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Get started</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Tell us about you
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          We’ll use this discovery info for workout progression, meal planning,
          and grocery lists tailored to your goals and kitchen.
        </p>
      </header>
      <OnboardingForm />
    </div>
  );
}
