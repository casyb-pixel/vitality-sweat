import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/app/OnboardingForm";
import {
  getMemberProfile,
  hasAcceptedCurrentTerms,
} from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Discovery onboarding",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { user } = await requireMemberAccess("/app/onboarding");
  const supabase = await createClient();
  const profile = await getMemberProfile(supabase, user.id);
  if (!hasAcceptedCurrentTerms(profile)) {
    redirect("/app/legal/accept");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Get started</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Tell us about you
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          We’ll use this discovery info for workout progression, meal planning,
          grocery lists, and local community offers near your ZIP.
        </p>
      </header>
      <OnboardingForm
        initialCity={profile?.city ?? ""}
        initialZipCode={profile?.zip_code ?? ""}
        initialRegion={profile?.region ?? ""}
      />
    </div>
  );
}
