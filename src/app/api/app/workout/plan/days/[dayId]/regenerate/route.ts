import { NextResponse } from "next/server";
import {
  buildWorkoutDayRegenPrompt,
  parseWorkoutDayRegenPayload,
  setStyleForGoal,
} from "@/lib/ai/workouts";
import {
  createGeminiClient,
  formatGeminiError,
  getGeminiApiKey,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import {
  getFitnessProfile,
  isOnboardingComplete,
  trainingPreferencesFromProfile,
} from "@/lib/fitness/profile";
import { resolveExerciseForProgram } from "@/lib/fitness/resolve-exercise";
import type { Exercise, PrimaryGoal } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 60;

const DAY_SELECT = `
  *,
  exercises:workout_program_exercises (
    *,
    exercise:exercises (
      id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active
    )
  )
`;

type RouteContext = { params: Promise<{ dayId: string }> };

/**
 * Regenerate a single scheduled program day via Gemini.
 * Does not archive the program or change days_per_week / other days.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { dayId } = await context.params;
    if (!dayId?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing day id." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    const profile = await getFitnessProfile(supabase, user.id);
    if (!isOnboardingComplete(profile) || !profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Complete onboarding before regenerating a workout day.",
        },
        { status: 400 },
      );
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart Next.js.",
        },
        { status: 503 },
      );
    }

    const { data: dayRow, error: dayError } = await supabase
      .from("workout_program_days")
      .select(
        "id, program_id, day_index, day_kind, label, focus, estimated_minutes, customized_at, scheduled_date, source",
      )
      .eq("id", dayId)
      .maybeSingle();

    if (dayError) {
      return NextResponse.json(
        { ok: false, error: dayError.message },
        { status: 500 },
      );
    }
    if (!dayRow) {
      return NextResponse.json(
        { ok: false, error: "Program day not found." },
        { status: 404 },
      );
    }

    const { data: program, error: programError } = await supabase
      .from("workout_programs")
      .select("id, user_id, status, session_minutes, primary_goal, days_per_week")
      .eq("id", dayRow.program_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (programError) {
      return NextResponse.json(
        { ok: false, error: programError.message },
        { status: 500 },
      );
    }
    if (!program || program.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Active program not found for this day." },
        { status: 404 },
      );
    }

    if (dayRow.day_kind === "bonus") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bonus days stay outside the scheduled rotation. Add a new extra instead of regenerating this one into the mapped plan.",
        },
        { status: 400 },
      );
    }

    const { data: siblingDays } = await supabase
      .from("workout_program_days")
      .select("id, label, focus, day_kind, day_index")
      .eq("program_id", program.id);

    const otherScheduled = (siblingDays ?? [])
      .filter(
        (d) =>
          d.id !== dayRow.id &&
          d.day_kind !== "bonus" &&
          d.day_index != null,
      )
      .map((d) => ({
        label: String(d.label ?? "Day"),
        focus: typeof d.focus === "string" ? d.focus : null,
      }));

    const prefs = trainingPreferencesFromProfile(profile);
    const minutes =
      typeof dayRow.estimated_minutes === "number" &&
      dayRow.estimated_minutes >= 5
        ? dayRow.estimated_minutes
        : prefs.session_minutes && prefs.session_minutes >= 5
          ? prefs.session_minutes
          : 45;

    const { data: catalogRows, error: catalogError } = await supabase
      .from("exercises")
      .select(
        "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(400);

    if (catalogError) {
      return NextResponse.json(
        { ok: false, error: catalogError.message },
        { status: 500 },
      );
    }

    const catalog = (catalogRows as Exercise[] | null) ?? [];
    const model = getGeminiModel();
    const prompt = buildWorkoutDayRegenPrompt(profile, prefs, catalog.map((e) => e.name), {
      currentLabel: String(dayRow.label ?? "Day"),
      currentFocus:
        typeof dayRow.focus === "string" ? dayRow.focus : null,
      dayIndex:
        typeof dayRow.day_index === "number" ? dayRow.day_index : null,
      minutes,
      otherScheduled,
    });

    let payload;
    try {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      const raw = (response.text ?? "").trim();
      if (!raw) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an empty day. Try again.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }
      payload = parseWorkoutDayRegenPayload(raw, {
        fallbackStyle: setStyleForGoal(
          program.primary_goal as PrimaryGoal | null,
        ),
        minutes,
      });
      if (!payload) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an unusable day. Try again.",
            provider: "gemini",
            model,
            raw: raw.slice(0, 1500),
          },
          { status: 502 },
        );
      }
    } catch (error) {
      const message = formatGeminiError(error);
      const connection = isLikelyConnectionError(error);
      return NextResponse.json(
        {
          ok: false,
          provider: "gemini",
          model,
          error: connection
            ? "Gemini connection dropped or timed out. Retry in a moment."
            : message,
          connectionError: connection,
        },
        { status: connection ? 504 : 502 },
      );
    }

    const resolveCache = new Map<string, Exercise>();
    const resolvedByName = new Map<string, Exercise>();
    for (const draft of payload.exercises) {
      const key = draft.name.trim().toLowerCase();
      if (resolvedByName.has(key)) continue;
      const resolved = await resolveExerciseForProgram(
        supabase,
        user.id,
        draft.name,
        catalog,
        resolveCache,
      );
      if (!resolved.ok) {
        return NextResponse.json(
          { ok: false, error: resolved.error, provider: "gemini", model },
          { status: 502 },
        );
      }
      resolvedByName.set(key, resolved.exercise);
    }

    // Replace exercises on this day only.
    const { error: deleteError } = await supabase
      .from("workout_program_exercises")
      .delete()
      .eq("day_id", dayRow.id);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 },
      );
    }

    const exerciseInserts = payload.exercises.map((draft, sortOrder) => {
      const exercise = resolvedByName.get(draft.name.trim().toLowerCase())!;
      return {
        day_id: dayRow.id,
        exercise_id: exercise.id,
        sort_order: sortOrder,
        sets: draft.sets,
        rep_min: draft.repMin,
        rep_max: draft.repMax,
        set_style: draft.setStyle,
        rest_sec: draft.restSec,
        coach_notes: draft.coachNotes,
        baseline_weight_lb: null,
        baseline_reps: null,
        last_prescription: null,
      };
    });

    if (exerciseInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("workout_program_exercises")
        .insert(exerciseInserts);
      if (insertError) {
        return NextResponse.json(
          { ok: false, error: insertError.message },
          { status: 500 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("workout_program_days")
      .update({
        label: payload.label,
        focus: payload.focus,
        estimated_minutes: payload.estimatedMinutes,
        customized_at: null,
        // Keep scheduled kind/index/source so rotation stays stable.
        day_kind: "scheduled",
        source: "program",
      })
      .eq("id", dayRow.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 },
      );
    }

    const { data: nested, error: nestedError } = await supabase
      .from("workout_program_days")
      .select(DAY_SELECT)
      .eq("id", dayRow.id)
      .single();

    if (nestedError || !nested) {
      return NextResponse.json({
        ok: true,
        provider: "gemini",
        model,
        summary: payload.summary,
        days_per_week_unchanged: true,
        day: { id: dayRow.id },
      });
    }

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      model,
      summary: payload.summary,
      days_per_week_unchanged: true,
      day: nested,
    });
  } catch (err) {
    console.error("[workout/plan/days/regenerate]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
