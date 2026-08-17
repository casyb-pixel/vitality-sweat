import { NextResponse } from "next/server";
import {
  buildWorkoutEvaluatePrompt,
  parseWorkoutEvaluatePayload,
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
import { fetchActiveNestedProgram } from "@/lib/fitness/program-query";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST() {
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

    const program = await fetchActiveNestedProgram(supabase, user.id);
    const prefs = trainingPreferencesFromProfile(profile);

    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id, started_at, status")
      .eq("user_id", user.id)
      .in("status", ["completed", "active"])
      .order("started_at", { ascending: false })
      .limit(8);

    const sessionIds = (sessions ?? []).map((s) => s.id as string);
    const { data: sets } = sessionIds.length
      ? await supabase
          .from("workout_sets")
          .select("session_id, exercise_id, weight_lb, reps, distance_m")
          .in("session_id", sessionIds)
      : { data: [] as Array<{
          session_id: string;
          exercise_id: string;
          weight_lb: number | null;
          reps: number | null;
          distance_m: number | null;
        }> };

    const exerciseIds = [
      ...new Set((sets ?? []).map((s) => s.exercise_id as string)),
    ];
    const { data: exerciseRows } = exerciseIds.length
      ? await supabase.from("exercises").select("id, name").in("id", exerciseIds)
      : { data: [] as Array<{ id: string; name: string }> };
    const exerciseNames = new Map(
      (exerciseRows ?? []).map((ex) => [ex.id, ex.name]),
    );

    const recentSessions = (sessions ?? []).map((session) => {
      const sessionSets = (sets ?? []).filter((s) => s.session_id === session.id);
      const byExercise = new Map<string, typeof sessionSets>();
      for (const row of sessionSets) {
        const list = byExercise.get(row.exercise_id) ?? [];
        list.push(row);
        byExercise.set(row.exercise_id, list);
      }
      return {
        startedAt: String(session.started_at),
        status: String(session.status),
        exercises: [...byExercise.entries()].map(([exerciseId, rows]) => {
          const weights = rows
            .map((r) => (r.weight_lb != null ? Number(r.weight_lb) : null))
            .filter((n): n is number => n != null && Number.isFinite(n));
          const reps = rows
            .map((r) => (r.reps != null ? Number(r.reps) : null))
            .filter((n): n is number => n != null && Number.isFinite(n));
          const distances = rows
            .map((r) => (r.distance_m != null ? Number(r.distance_m) : null))
            .filter((n): n is number => n != null && Number.isFinite(n));
          return {
            name: exerciseNames.get(exerciseId) ?? "exercise",
            sets: rows.length,
            bestWeightLb: weights.length ? Math.max(...weights) : null,
            bestReps: reps.length ? Math.max(...reps) : null,
            distanceM: distances.length ? Math.max(...distances) : null,
          };
        }),
      };
    });

    const { data: weighIns } = await supabase
      .from("body_weight_logs")
      .select("recorded_on, weight_lb")
      .eq("user_id", user.id)
      .order("recorded_on", { ascending: false })
      .limit(6);

    const { data: measurements } = await supabase
      .from("body_measurement_logs")
      .select("recorded_on, chest_in, bicep_in, waist_in, thigh_in")
      .eq("user_id", user.id)
      .order("recorded_on", { ascending: false })
      .limit(4);

    const prompt = buildWorkoutEvaluatePrompt({
      profile,
      prefs,
      programSummary: program?.summary ?? null,
      origin: program?.origin ? String(program.origin) : null,
      days: (program?.days ?? [])
        .filter((d) => (d.day_kind ?? "scheduled") === "scheduled")
        .map((day) => ({
          label: day.label,
          focus: day.focus,
          exercises: (day.exercises ?? []).map((ex) => ({
            name: ex.exercise?.name ?? "exercise",
            sets: ex.sets,
            repMin: ex.rep_min,
            repMax: ex.rep_max,
          })),
        })),
      recentSessions,
      weighIns: (weighIns ?? []).map((w) => ({
        recordedOn: String(w.recorded_on),
        weightLb: Number(w.weight_lb),
      })),
      measurements: (measurements ?? []).map((m) => ({
        recordedOn: String(m.recorded_on),
        chestIn: m.chest_in != null ? Number(m.chest_in) : null,
        bicepIn: m.bicep_in != null ? Number(m.bicep_in) : null,
        waistIn: m.waist_in != null ? Number(m.waist_in) : null,
        thighIn: m.thigh_in != null ? Number(m.thigh_in) : null,
      })),
    });

    const model = getGeminiModel();
    try {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      const raw = (response.text ?? "").trim();
      const evaluation = raw ? parseWorkoutEvaluatePayload(raw) : null;
      if (!evaluation) {
        return NextResponse.json(
          {
            ok: false,
            error: "Could not read the evaluation. Try again.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, provider: "gemini", model, evaluation });
    } catch (error) {
      const connection = isLikelyConnectionError(error);
      return NextResponse.json(
        {
          ok: false,
          provider: "gemini",
          model,
          error: connection
            ? "Gemini connection dropped or timed out. Retry in a moment."
            : formatGeminiError(error),
        },
        { status: connection ? 504 : 502 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
