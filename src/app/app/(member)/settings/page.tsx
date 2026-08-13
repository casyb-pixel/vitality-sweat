import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MemberSettingsClient from "@/components/app/MemberSettingsClient";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { getFitnessProfile, isOnboardingComplete } from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { user } = await requireMemberAccess("/app/settings");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) redirect(completion);
  if (!profile) redirect("/app/onboarding");
  const { data: account } = await supabase
    .from("profiles")
    .select("username, engine_plus")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <MemberSettingsClient
      profile={profile}
      username={(account?.username as string | null) ?? ""}
      enginePlus={Boolean(account?.engine_plus)}
    />
  );
}
