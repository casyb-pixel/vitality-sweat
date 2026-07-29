import { NextResponse } from "next/server";
import {
  normalizeDishKey,
  upsertDishRating,
} from "@/lib/fitness/dishes";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import { mergeUniqueStrings } from "@/lib/ai/nutrition";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";

type RateBody = {
  dish?: string;
  rating?: number;
};

/**
 * Save a 1–5 dish rating. Low scores (1–2) also soft-reject the dish
 * so future plans suggest it rarely/never.
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

    let body: RateBody;
    try {
      body = (await request.json()) as RateBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const dish = (body.dish ?? "").trim();
    const rating = Number(body.rating);
    if (!dish) {
      return NextResponse.json(
        { ok: false, error: "Send the dish name." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { ok: false, error: "Rating must be an integer from 1 to 5." },
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

    const dish_ratings = upsertDishRating(profile.dish_ratings, dish, rating);
    let meal_rejects = profile.meal_rejects ?? [];
    if (rating <= 2) {
      const label = dish.length > 80 ? `${dish.slice(0, 77)}…` : dish;
      meal_rejects = mergeUniqueStrings(meal_rejects, [label], 80);
    }

    const { error } = await supabase
      .from("fitness_profiles")
      .update({ dish_ratings, meal_rejects })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const key = normalizeDishKey(dish);
    return NextResponse.json({
      ok: true,
      rating,
      entry: dish_ratings[key] ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
