import type { Metadata } from "next";
import { redirect } from "next/navigation";
import WorkoutTracker from "@/components/app/WorkoutTracker";
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

  if (!isOnboardingComplete(profile)) {
    redirect("/app/onboarding");
  }

  const [{ data: exercises }, { data: activeSession }] = await Promise.all([
    supabase
      .from("exercises")
      .select("*")
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
          Pick an exercise, log weight, reps, and how hard it felt. Easy sets
          get a progressive overload suggestion next time.
        </p>
      </header>

      <WorkoutTracker
        exercises={(exercises as Exercise[] | null) ?? []}
        initialSession={(activeSession as WorkoutSession | null) ?? null}
      />
    </div>
  );
}
