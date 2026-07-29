import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NutritionPlanner from "@/components/app/NutritionPlanner";
import { requireMemberAccess } from "@/lib/auth/member";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import type { MealPlan } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Nutrition",
  robots: { index: false, follow: false },
};

export default async function NutritionPage() {
  const { user } = await requireMemberAccess("/app/nutrition");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);

  if (!isOnboardingComplete(profile)) {
    redirect("/app/onboarding");
  }

  let { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mealPlan && !mealPlan.grocery_share_token) {
    const token = crypto.randomUUID();
    const { data: patched } = await supabase
      .from("meal_plans")
      .update({ grocery_share_token: token })
      .eq("id", mealPlan.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    mealPlan = patched ?? { ...mealPlan, grocery_share_token: token };
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3 print:hidden">
        <p className="eyebrow text-brand-orange">Peak Nutrition</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Meal plan &amp; grocery list
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Generate a week of meals, tweak any day you don’t like (we’ll remember
          why), and print or share the shopping list.
        </p>
      </header>

      <NutritionPlanner initialPlan={(mealPlan as MealPlan | null) ?? null} />
    </div>
  );
}
