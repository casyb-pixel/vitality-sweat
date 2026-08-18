import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EngineRoomClient from "@/components/app/EngineRoomClient";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { getFitnessProfile, isOnboardingComplete } from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "The Engine Room",
  robots: { index: false, follow: false },
};

export default async function EngineRoomPage() {
  const { user } = await requireMemberAccess("/app/engine-room");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) redirect(completion);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">Crew</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          The Engine Room
        </h1>
        <p className="max-w-xl font-sans text-sm text-brand-muted">
          Celebrate wins with people you follow. Post a finished session to lock
          ranks. Opt in if you want to share with the wider Engine Room.
        </p>
      </header>
      <EngineRoomClient />
    </div>
  );
}
