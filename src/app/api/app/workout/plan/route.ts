import { NextResponse } from "next/server";
import {
  buildWorkoutPlanPrompt,
  parseWorkoutPlanPayload,
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
import type {
  Exercise,
  WorkoutProgram,
  WorkoutProgramDay,
  WorkoutProgramExercise,
} from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

/**
 * Edge keeps Gemini off Node cold starts (same pattern as meal-plan).
 * Local catalog matching keeps most exercise resolves off Gemini.
 */
export const runtime = "edge";
export const maxDuration = 60;

type NestedProgram = WorkoutProgram & {
  days: Array<
    WorkoutProgramDay & {
      exercises: Array<
        WorkoutProgramExercise & {
          exercise?: Exercise | null;
        }
      >;
    }
  >;
};

function sortNestedProgram(program: NestedProgram): NestedProgram {
  const days = [...(program.days ?? [])]
    .sort((a, b) => {
      const aBonus = (a.day_kind ?? "scheduled") === "bonus";
      const bBonus = (b.day_kind ?? "scheduled") === "bonus";
      if (aBonus !== bBonus) return aBonus ? 1 : -1;
      if (!aBonus && !bBonus) {
        return (a.day_index ?? 0) - (b.day_index ?? 0);
      }
      return String(b.scheduled_date ?? "").localeCompare(
        String(a.scheduled_date ?? ""),
      );
    })
    .map((day) => ({
      ...day,
      exercises: [...(day.exercises ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }));
  return { ...program, days };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("workout_programs")
    .select(
      `
      *,
      days:workout_program_days (
        *,
        exercises:workout_program_exercises (
          *,
          exercise:exercises (
            id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active
          )
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: true, program: null });
  }

  return NextResponse.json({
    ok: true,
    program: sortNestedProgram(data as NestedProgram),
  });
}

export async function POST() {
  try {
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
          error: "Complete onboarding before generating a workout program.",
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

    const prefs = trainingPreferencesFromProfile(profile);
    const expectedDays =
      prefs.days_per_week && prefs.days_per_week >= 1 && prefs.days_per_week <= 7
        ? prefs.days_per_week
        : 3;

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
    const catalogNames = catalog.map((ex) => ex.name);

    const model = getGeminiModel();
    const prompt = buildWorkoutPlanPrompt(profile, prefs, catalogNames);

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
            error: "Gemini returned an empty workout program.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }

      payload = parseWorkoutPlanPayload(raw, {
        expectedDays,
        fallbackStyle: setStyleForGoal(profile.primary_goal),
      });
      if (!payload) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an unusable workout program. Try again.",
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

    // Resolve every unique exercise name → catalog id (local-first).
    const resolveCache = new Map<string, Exercise>();
    const resolvedByName = new Map<string, Exercise>();

    for (const day of payload.days) {
      for (const draft of day.exercises) {
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
            {
              ok: false,
              error: resolved.error,
              provider: "gemini",
              model,
            },
            { status: 502 },
          );
        }
        resolvedByName.set(key, resolved.exercise);
      }
    }

    // Archive any prior active program for this member.
    const { error: archiveError } = await supabase
      .from("workout_programs")
      .update({ status: "archived" })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (archiveError) {
      return NextResponse.json(
        { ok: false, error: archiveError.message },
        { status: 500 },
      );
    }

    const preferencesSnapshot = {
      days_per_week: prefs.days_per_week,
      session_minutes: prefs.session_minutes,
      equipment: prefs.equipment,
      focus_muscles: prefs.focus_muscles,
      avoidances: prefs.avoidances,
      preferred_split: prefs.preferred_split,
    };

    const { data: program, error: programError } = await supabase
      .from("workout_programs")
      .insert({
        user_id: user.id,
        status: "active",
        primary_goal: profile.primary_goal,
        days_per_week: expectedDays,
        session_minutes: prefs.session_minutes ?? 45,
        summary: payload.summary,
        preferences: preferencesSnapshot,
      })
      .select("*")
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { ok: false, error: programError?.message ?? "Could not save program." },
        { status: 500 },
      );
    }

    const dayRows: Array<{
      id: string;
      day_index: number;
    }> = [];

    for (const day of payload.days) {
      const { data: dayRow, error: dayError } = await supabase
        .from("workout_program_days")
        .insert({
          program_id: program.id,
          day_index: day.dayIndex,
          day_kind: "scheduled",
          source: "program",
          scheduled_date: null,
          label: day.label,
          focus: day.focus,
          estimated_minutes: day.estimatedMinutes,
          notes: null,
        })
        .select("id, day_index")
        .single();

      if (dayError || !dayRow) {
        await supabase.from("workout_programs").delete().eq("id", program.id);
        return NextResponse.json(
          {
            ok: false,
            error: dayError?.message ?? "Could not save program day.",
          },
          { status: 500 },
        );
      }
      dayRows.push(dayRow);

      const exerciseInserts = day.exercises.map((draft, sortOrder) => {
        const exercise = resolvedByName.get(draft.name.trim().toLowerCase());
        return {
          day_id: dayRow.id,
          exercise_id: exercise!.id,
          sort_order: sortOrder,
          sets: draft.sets,
          rep_min: draft.repMin,
          rep_max: draft.repMax,
          set_style: draft.setStyle,
          rest_sec: draft.restSec,
          coach_notes: draft.coachNotes,
          baseline_weight_lb: null,
          baseline_reps: null,
        };
      });

      if (exerciseInserts.length > 0) {
        const { error: exError } = await supabase
          .from("workout_program_exercises")
          .insert(exerciseInserts);
        if (exError) {
          await supabase.from("workout_programs").delete().eq("id", program.id);
          return NextResponse.json(
            { ok: false, error: exError.message },
            { status: 500 },
          );
        }
      }
    }

    // Re-fetch nested program for the response.
    const { data: nested, error: nestedError } = await supabase
      .from("workout_programs")
      .select(
        `
        *,
        days:workout_program_days (
          *,
          exercises:workout_program_exercises (
            *,
            exercise:exercises (
              id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active
            )
          )
        )
      `,
      )
      .eq("id", program.id)
      .single();

    if (nestedError || !nested) {
      return NextResponse.json({
        ok: true,
        provider: "gemini",
        model,
        program: {
          ...program,
          days: dayRows,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      model,
      program: sortNestedProgram(nested as NestedProgram),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
