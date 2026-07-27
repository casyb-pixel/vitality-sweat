import { NextResponse } from "next/server";
import {
  buildMealPlanPrompt,
  parseMealPlanPayload,
  startOfWeekISO,
} from "@/lib/ai/nutrition";
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
} from "@/lib/fitness/profile";
import { createClient } from "@/utils/supabase/server";

/**
 * Edge keeps Gemini off Node cold starts and raises the practical timeout
 * ceiling on Hobby (Edge ~25s vs Serverless ~10s), which avoids Vercel’s
 * HTML timeout page that the client then fails to parse as JSON.
 */
export const runtime = "edge";
export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mealPlan: data });
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
          error: "Complete onboarding before generating a meal plan.",
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

    const model = getGeminiModel();
    const prompt = buildMealPlanPrompt(profile);

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
          { ok: false, error: "Gemini returned an empty meal plan.", provider: "gemini", model },
          { status: 502 },
        );
      }

      const payload = parseMealPlanPayload(raw);
      if (!payload) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an unusable meal plan. Try again.",
            provider: "gemini",
            model,
            raw: raw.slice(0, 1500),
          },
          { status: 502 },
        );
      }

      const weekStart = startOfWeekISO();
      const { data, error } = await supabase
        .from("meal_plans")
        .insert({
          user_id: user.id,
          week_start: weekStart,
          plan: payload,
          grocery_list: payload.groceryList,
          snacks: payload.snacks,
          model,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        provider: "gemini",
        model,
        mealPlan: data,
      });
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
