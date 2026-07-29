import { NextResponse } from "next/server";
import {
  createGeminiClient,
  formatGeminiError,
  getGeminiApiKey,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import { asMealPlanPayload } from "@/lib/ai/nutrition";
import {
  buildDishRecipePrompt,
  normalizeDishKey,
  parseDishRecipe,
} from "@/lib/fitness/dishes";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import type { GroceryItem, MealPlan, MealPlanPayload } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 60;

type RecipeBody = {
  meal_plan_id?: string;
  dish?: string;
  slot?: string;
  day?: string;
};

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

    let body: RecipeBody;
    try {
      body = (await request.json()) as RecipeBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const dish = (body.dish ?? "").trim();
    const mealPlanId = (body.meal_plan_id ?? "").trim();
    const slot = (body.slot ?? "meal").trim() || "meal";
    const day = (body.day ?? "").trim();

    if (!dish || !mealPlanId) {
      return NextResponse.json(
        { ok: false, error: "Send meal_plan_id and dish." },
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
    const dishKey = normalizeDishKey(dish);
    const cached = payload?.recipes?.[dishKey];
    if (cached) {
      return NextResponse.json({
        ok: true,
        cached: true,
        recipe: cached,
        rating: profile.dish_ratings?.[dishKey]?.rating ?? null,
      });
    }

    const groceryList = Array.isArray(mealPlan.grocery_list)
      ? (mealPlan.grocery_list as GroceryItem[])
      : payload?.groceryList ?? [];

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
    const prompt = buildDishRecipePrompt({
      dish,
      slot,
      day: day || undefined,
      groceryList,
      profile,
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
            error: "Gemini returned an empty recipe.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }

      const recipe = parseDishRecipe(raw);
      if (!recipe) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an unusable recipe. Try again.",
            provider: "gemini",
            model,
            raw: raw.slice(0, 1200),
          },
          { status: 502 },
        );
      }

      if (payload) {
        const nextPayload: MealPlanPayload = {
          ...payload,
          recipes: {
            ...(payload.recipes ?? {}),
            [dishKey]: recipe,
          },
        };
        await supabase
          .from("meal_plans")
          .update({ plan: nextPayload })
          .eq("id", mealPlan.id)
          .eq("user_id", user.id);
      }

      return NextResponse.json({
        ok: true,
        cached: false,
        provider: "gemini",
        model,
        recipe,
        rating: profile.dish_ratings?.[dishKey]?.rating ?? null,
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
