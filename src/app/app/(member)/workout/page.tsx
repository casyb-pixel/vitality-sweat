import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { NestedWorkoutProgram } from "@/components/app/WorkoutAgent";
import WorkoutWorkspace from "@/components/app/WorkoutWorkspace";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import {
  getFitnessProfile,
  isOnboardingComplete,
  trainingPreferencesFromProfile,
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

  const [
    { data: exercises },
    { data: activeSession },
    { data: activeProgram },
  ] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at, youtube_url, cues, how_to",
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
    supabase
      .from("workout_programs")
      .select(
        `
        *,
        days:workout_program_days (
          *,
          exercises:workout_program_exercises (
            *,
            exercise:exercises (
              id, name, category, primary_muscle, equipment, youtube_url, cues, how_to, tracking_type
            )
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const prefs = profile
    ? trainingPreferencesFromProfile(profile)
    : {
        days_per_week: null,
        session_minutes: null,
        equipment: [],
        focus_muscles: [],
        avoidances: null,
        preferred_split: null,
      };

  return (
    <div className="space-y-8">
      <WorkoutWorkspace
        initialProgram={(activeProgram as NestedWorkoutProgram | null) ?? null}
        initialPrefs={prefs}
        exercises={(exercises as Exercise[] | null) ?? []}
        initialSession={(activeSession as WorkoutSession | null) ?? null}
        profileGoal={profile?.primary_goal ?? null}
      />
    </div>
  );
}
