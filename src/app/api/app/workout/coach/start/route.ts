import { NextResponse } from "next/server";
import {
  buildWorkoutStartCoachPrompt,
  parseWorkoutStartCoachCopy,
} from "@/lib/ai/workouts";
import {
  createGeminiClient,
  formatGeminiError,
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/ai/gemini";
import { getFitnessProfile, isOnboardingComplete } from "@/lib/fitness/profile";
import { ageFromBirthdate } from "@/lib/fitness/profile";
import {
  buildSessionChallenges,
  fallbackCoachCopy,
  type CoachBrief,
} from "@/lib/fitness/session-coach";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { stripEmDashesDeep } from "@/lib/text/humanize-copy";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const profile = await getFitnessProfile(supabase, user.id);
    if (!isOnboardingComplete(profile) || !profile) {
      return NextResponse.json(
        { ok: false, error: "Complete onboarding first." },
        { status: 400 },
      );
    }
    if (profile.session_coach_opt_in === false) {
      return NextResponse.json({ ok: true, skipped: true, brief: null });
    }

    let body: { session_id?: string; program_day_id?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
    const sessionId = body.session_id?.trim();
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Send session_id." },
        { status: 400 },
      );
    }

    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id, coach_brief, program_day_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Session not found." }, { status: 404 });
    }
    if (session.coach_brief && typeof session.coach_brief === "object") {
      return NextResponse.json({
        ok: true,
        brief: session.coach_brief as CoachBrief,
        resumed: true,
      });
    }

    const dayId = body.program_day_id?.trim() || session.program_day_id;
    let planned: Array<{
      exerciseId: string;
      name: string;
      category: string | null;
      trackingType: string | null;
    }> = [];
    let sessionLabel = "today's workout";
    if (dayId) {
      const { data: day } = await supabase
        .from("workout_program_days")
        .select(
          `
          label,
          exercises:workout_program_exercises (
            exercise_id, sort_order,
            exercise:exercises ( id, name, category, tracking_type )
          )
        `,
        )
        .eq("id", dayId)
        .maybeSingle();
      if (day) {
        sessionLabel = String(day.label ?? sessionLabel);
        const rows = [...((day.exercises as Array<{
          exercise_id: string;
          sort_order: number;
          exercise?: { name?: string; category?: string; tracking_type?: string } | null;
        }>) ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        planned = rows.map((row) => ({
          exerciseId: row.exercise_id,
          name: row.exercise?.name ?? "exercise",
          category: row.exercise?.category ?? null,
          trackingType: row.exercise?.tracking_type ?? null,
        }));
      }
    }

    const admin = createServiceRoleClient();
    const challenges = await buildSessionChallenges({
      supabase,
      admin,
      userId: user.id,
      profile,
      planned,
    });

    const fallback = fallbackCoachCopy(challenges);
    let copy = fallback;
    const apiKey = getGeminiApiKey();
    if (apiKey) {
      try {
        const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
        const ai = createGeminiClient(apiKey);
        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: buildWorkoutStartCoachPrompt({
            profile,
            sessionLabel,
            sessionChallenge: challenges.sessionChallenge?.message ?? "Show up and log the work.",
            crossoverChallenge: challenges.crossover?.message ?? null,
            ageUnder35: age != null && age < 35,
          }),
          config: { responseMimeType: "application/json" },
        });
        const parsed = parseWorkoutStartCoachCopy((response.text ?? "").trim());
        if (parsed) copy = parsed;
      } catch (error) {
        console.error("[workout/coach]", formatGeminiError(error));
      }
    }

    const brief: CoachBrief = stripEmDashesDeep({
      headline: copy.headline,
      body: copy.body,
      sessionChallenge: challenges.sessionChallenge,
      crossover: challenges.crossover,
      generatedAt: new Date().toISOString(),
    });

    await supabase
      .from("workout_sessions")
      .update({ coach_brief: brief })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, brief, resumed: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
