import { NextResponse } from "next/server";
import {
  buildBonusDayPrompt,
  parseBonusDayPayload,
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
import type { Exercise } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 60;

function startOfLocalWeekISO(d = new Date()): string {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function todayISO(clientDate?: string | null): string {
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return clientDate;
  return new Date().toISOString().slice(0, 10);
}

const DAY_SELECT = `
  *,
  exercises:workout_program_exercises (
    *,
    exercise:exercises (
      id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active
    )
  )
`;

export async function POST(request: Request) {
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
          error: "Complete onboarding before adding an extra workout.",
        },
        { status: 400 },
      );
    }

    let body: {
      focus_hint?: string;
      minutes?: number;
      equipment?: string[];
      scheduled_date?: string;
      replace_existing?: boolean;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const { data: program, error: programError } = await supabase
      .from("workout_programs")
      .select("id, days_per_week, session_minutes, primary_goal, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (programError) {
      return NextResponse.json(
        { ok: false, error: programError.message },
        { status: 500 },
      );
    }
    if (!program) {
      return NextResponse.json(
        {
          ok: false,
          error: "Build a workout plan first, then you can add an extra session.",
        },
        { status: 400 },
      );
    }

    const scheduledDate = todayISO(body.scheduled_date ?? null);
    const minutes =
      typeof body.minutes === "number" &&
      Number.isFinite(body.minutes) &&
      body.minutes >= 5 &&
      body.minutes <= 180
        ? Math.round(body.minutes)
        : program.session_minutes ?? 45;

    const { data: existingBonus } = await supabase
      .from("workout_program_days")
      .select("id, label")
      .eq("program_id", program.id)
      .eq("day_kind", "bonus")
      .eq("scheduled_date", scheduledDate)
      .maybeSingle();

    if (existingBonus && body.replace_existing !== true) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You already have an extra session for this date. Confirm replace_existing to swap it.",
          existing_bonus_id: existingBonus.id,
          code: "bonus_exists",
        },
        { status: 409 },
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
    const equipmentOverride = Array.isArray(body.equipment)
      ? body.equipment.filter((item): item is string => typeof item === "string")
      : undefined;

    // --- Overlap context ---
    const since = new Date();
    since.setHours(since.getHours() - 72);

    const weekStart = startOfLocalWeekISO();

    const [{ data: recentSessions }, { data: scheduledDays }, { data: catalogRows }] =
      await Promise.all([
        supabase
          .from("workout_sessions")
          .select(
            `
            id, started_at, status, program_day_id, ended_at,
            sets:workout_sets (
              exercise_id,
              exercise:exercises ( primary_muscle, name )
            ),
            day:workout_program_days ( id, label, focus, day_kind )
          `,
          )
          .eq("user_id", user.id)
          .in("status", ["completed", "active"])
          .gte("started_at", since.toISOString())
          .order("started_at", { ascending: false })
          .limit(12),
        supabase
          .from("workout_program_days")
          .select("id, label, focus, day_index, day_kind")
          .eq("program_id", program.id)
          .eq("day_kind", "scheduled")
          .order("day_index", { ascending: true }),
        supabase
          .from("exercises")
          .select(
            "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
          )
          .eq("is_active", true)
          .order("name", { ascending: true })
          .limit(400),
      ]);

    const recentMuscles = new Set<string>();
    const recentDayFocuses = new Set<string>();
    for (const session of recentSessions ?? []) {
      const dayFocus = (
        session as { day?: { focus?: string | null } | null }
      ).day?.focus;
      if (dayFocus?.trim()) recentDayFocuses.add(dayFocus.trim().toLowerCase());
      const sets = (
        session as {
          sets?: Array<{
            exercise?: { primary_muscle?: string | null } | null;
          }>;
        }
      ).sets;
      for (const set of sets ?? []) {
        const muscle = set.exercise?.primary_muscle?.trim();
        if (muscle) recentMuscles.add(muscle.toLowerCase());
      }
    }

    const scheduledIds = (scheduledDays ?? []).map((d) => d.id);
    const { data: weekSessions } = scheduledIds.length
      ? await supabase
          .from("workout_sessions")
          .select("id, program_day_id, status, started_at")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("started_at", `${weekStart}T00:00:00.000Z`)
          .in("program_day_id", scheduledIds)
      : { data: [] as Array<{ program_day_id: string | null }> };

    const completedDayIds = new Set(
      (weekSessions ?? [])
        .map((s) => s.program_day_id)
        .filter((id): id is string => Boolean(id)),
    );

    const completedScheduledThisWeek = (scheduledDays ?? [])
      .filter((d) => completedDayIds.has(d.id))
      .map((d) => ({ label: d.label, focus: d.focus }));

    const upcomingScheduled = (scheduledDays ?? [])
      .filter((d) => !completedDayIds.has(d.id))
      .slice(0, 3)
      .map((d) => ({ label: d.label, focus: d.focus }));

    const catalog = (catalogRows as Exercise[] | null) ?? [];
    const catalogNames = catalog.map((ex) => ex.name);
    const model = getGeminiModel();
    const prompt = buildBonusDayPrompt(profile, prefs, catalogNames, {
      recentMuscles: [...recentMuscles],
      recentDayFocuses: [...recentDayFocuses],
      upcomingScheduled,
      completedScheduledThisWeek,
      focusHint: body.focus_hint?.trim() || null,
      minutes,
      equipment: equipmentOverride,
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
            error: "Gemini returned an empty bonus workout.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }
      payload = parseBonusDayPayload(raw, {
        fallbackStyle: setStyleForGoal(profile.primary_goal),
        minutes,
      });
      if (!payload) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an unusable bonus workout. Try again.",
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

    if (existingBonus && body.replace_existing === true) {
      await supabase
        .from("workout_program_days")
        .delete()
        .eq("id", existingBonus.id);
    }

    const note = `Extra session: your ${program.days_per_week ?? scheduledDays?.length ?? "mapped"}-day plan is unchanged. ${payload.summary}`;

    const { data: dayRow, error: dayError } = await supabase
      .from("workout_program_days")
      .insert({
        program_id: program.id,
        day_index: null,
        day_kind: "bonus",
        source: "bonus_agent",
        scheduled_date: scheduledDate,
        label: payload.label,
        focus: payload.focus,
        estimated_minutes: payload.estimatedMinutes,
        notes: note,
      })
      .select("*")
      .single();

    if (dayError || !dayRow) {
      return NextResponse.json(
        { ok: false, error: dayError?.message ?? "Could not save bonus day." },
        { status: 500 },
      );
    }

    const exerciseInserts = payload.exercises.map((draft, sortOrder) => {
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
        await supabase.from("workout_program_days").delete().eq("id", dayRow.id);
        return NextResponse.json(
          { ok: false, error: exError.message },
          { status: 500 },
        );
      }
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
        bonusDay: dayRow,
        note,
      });
    }

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      model,
      bonusDay: nested,
      note,
      days_per_week_unchanged: program.days_per_week,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
