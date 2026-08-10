import type { Metadata } from "next";
import { redirect } from "next/navigation";
import WorkoutTracker from "@/components/app/WorkoutTracker";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import type { Exercise, WorkoutSession } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Workout",
  robots: { index: false, follow: false },
};

export default async function WorkoutPage() {
  const { user } = await requireMemberAccess("/app/workout");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) {
    redirect(completion);
  }

  const [{ data: exercises }, { data: activeSession }] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Training</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Log today’s workout
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Narrow by equipment and focus, type to search the library, or look up
          a new movement with AI — it matches synonyms and avoids duplicates.
          Log weight, reps, and how hard it felt for progressive overload next
          time.
        </p>
      </header>

      <WorkoutTracker
        exercises={(exercises as Exercise[] | null) ?? []}
        initialSession={(activeSession as WorkoutSession | null) ?? null}
      />
    </div>
  );
}
