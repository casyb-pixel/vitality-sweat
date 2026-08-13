import type { Metadata } from "next";
import { redirect } from "next/navigation";
import WorkoutHistoryClient from "@/components/app/WorkoutHistoryClient";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { getFitnessProfile, isOnboardingComplete } from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Workout history",
  robots: { index: false, follow: false },
};

export default async function HistoryPage() {
  const { user } = await requireMemberAccess("/app/history");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) redirect(completion);
  return <WorkoutHistoryClient />;
}
