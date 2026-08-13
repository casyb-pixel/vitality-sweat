import type { Metadata } from "next";
import { redirect } from "next/navigation";
import WorkoutProgressClient from "@/components/app/WorkoutProgressClient";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { getFitnessProfile, isOnboardingComplete } from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Progress",
  robots: { index: false, follow: false },
};

export default async function ProgressPage() {
  const { user } = await requireMemberAccess("/app/progress");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) redirect(completion);
  return <WorkoutProgressClient />;
}
