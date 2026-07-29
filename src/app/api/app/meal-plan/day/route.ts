import { NextResponse } from "next/server";
import {
  asMealPlanPayload,
  buildDayRegenPrompt,
  mergeGroceryLists,
  mergeUniqueStrings,
  parseDayRegenPayload,
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
import type {
  GroceryItem,
  MealDay,
  MealFeedbackEntry,
  MealPlan,
  MealPlanPayload,
} from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 60;

type DayRegenBody = {
  meal_plan_id?: string;
  day?: string;
  reason?: string;
};

/**
 * Regenerate a single day of an existing meal plan after capturing why.
 * Updates disliked_foods + meal_rejects on the fitness profile.
 */
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

    let body: DayRegenBody;
    try {
      body = (await request.json()) as DayRegenBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const mealPlanId = (body.meal_plan_id ?? "").trim();
    const dayName = (body.day ?? "").trim();
    const reason = (body.reason ?? "").trim();

    if (!mealPlanId || !dayName) {
      return NextResponse.json(
        { ok: false, error: "Send meal_plan_id and day." },
        { status: 400 },
      );
    }
    if (reason.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Tell us why you want a different day (a few words is fine)." },
        { status: 400 },
      );
    }

    const profile = await getFitnessProfile(supabase, user.id);
    if (!isOnboardingComplete(profile) || !profile) {
      return NextResponse.json(
        { ok: false, error: "Complete onboarding first." },
        { status: 400 },
      );
    }

    const { data: planRow, error: planError } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", mealPlanId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError || !planRow) {
      return NextResponse.json(
        { ok: false, error: planError?.message ?? "Meal plan not found." },
        { status: 404 },
      );
    }

    const mealPlan = planRow as MealPlan;
    const payload = asMealPlanPayload(mealPlan.plan as MealPlanPayload);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Meal plan data is incomplete." },
        { status: 400 },
      );
    }

    const dayIndex = payload.days.findIndex(
      (d) => d.day.toLowerCase() === dayName.toLowerCase(),
    );
    if (dayIndex < 0) {
      return NextResponse.json(
        { ok: false, error: `Day “${dayName}” was not found in this plan.` },
        { status: 400 },
      );
    }

    const previousDay = payload.days[dayIndex]!;
    const otherDays = payload.days.filter((_, i) => i !== dayIndex);

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
    const prompt = buildDayRegenPrompt({
      profile,
      dayName: previousDay.day,
      previousDay,
      reason,
      otherDays,
    });

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
            error: "Gemini returned an empty day plan.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }

      const parsed = parseDayRegenPayload(raw);
      if (!parsed) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an unusable day plan. Try again.",
            provider: "gemini",
            model,
            raw: raw.slice(0, 1200),
          },
          { status: 502 },
        );
      }

      // Keep the original day label casing from the plan.
      const newDay: MealDay = {
        ...parsed.day,
        day: previousDay.day,
      };

      const nextDays = [...payload.days];
      nextDays[dayIndex] = newDay;

      const existingGrocery = Array.isArray(mealPlan.grocery_list)
        ? (mealPlan.grocery_list as GroceryItem[])
        : payload.groceryList;

      const nextGrocery = mergeGroceryLists(
        existingGrocery,
        parsed.groceryDelta,
      );

      const nextPayload: MealPlanPayload = {
        ...payload,
        days: nextDays,
        groceryList: nextGrocery,
      };

      const fallbackRejects = [
        previousDay.breakfast,
        previousDay.lunch,
        previousDay.dinner,
      ]
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m) => (m.length > 80 ? `${m.slice(0, 77)}…` : m));

      const nextRejects = mergeUniqueStrings(
        profile.meal_rejects ?? [],
        parsed.rejectedMealLabels.length
          ? parsed.rejectedMealLabels
          : fallbackRejects,
        80,
      );

      const nextDislikes = mergeUniqueStrings(
        profile.disliked_foods ?? [],
        parsed.dislikedFoods,
        60,
      );

      const feedbackEntry: MealFeedbackEntry = {
        at: new Date().toISOString(),
        day: previousDay.day,
        reason,
        rejected: {
          breakfast: previousDay.breakfast,
          lunch: previousDay.lunch,
          dinner: previousDay.dinner,
        },
        extracted_dislikes: parsed.dislikedFoods,
      };

      const priorFeedback = Array.isArray(
        (profile.goal_details as { meal_feedback?: unknown })?.meal_feedback,
      )
        ? ((profile.goal_details as { meal_feedback: MealFeedbackEntry[] })
            .meal_feedback)
        : [];

      const nextGoalDetails = {
        ...profile.goal_details,
        meal_feedback: [...priorFeedback, feedbackEntry].slice(-40),
      };

      const { error: profileError } = await supabase
        .from("fitness_profiles")
        .update({
          disliked_foods: nextDislikes,
          meal_rejects: nextRejects,
          goal_details: nextGoalDetails,
        })
        .eq("id", user.id);

      if (profileError) {
        return NextResponse.json(
          { ok: false, error: profileError.message },
          { status: 500 },
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from("meal_plans")
        .update({
          plan: nextPayload,
          grocery_list: nextGrocery,
          model,
        })
        .eq("id", mealPlan.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        provider: "gemini",
        model,
        mealPlan: updated,
        addedDislikes: parsed.dislikedFoods,
        day: newDay,
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
