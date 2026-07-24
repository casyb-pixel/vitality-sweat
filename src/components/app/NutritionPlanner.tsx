"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  GroceryItem,
  MealDay,
  MealPlan,
  SnackIdea,
} from "@/lib/fitness/types";

type NutritionPlannerProps = {
  initialPlan: MealPlan | null;
};

export default function NutritionPlanner({ initialPlan }: NutritionPlannerProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlan | null>(initialPlan);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function regenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/app/meal-plan", { method: "POST" });
        const contentType = res.headers.get("content-type") ?? "";
        const raw = await res.text();

        // Hosting timeouts / Next error pages return HTML — surface that clearly.
        if (
          !contentType.includes("application/json") ||
          raw.trimStart().startsWith("<!")
        ) {
          setError(
            res.status === 504 || res.status === 408
              ? "Meal plan generation timed out. Please try again in a moment."
              : `Meal plan request failed (${res.status || "unknown"}). The server returned an error page instead of JSON — try again, or check that GEMINI_API_KEY is set in production.`,
          );
          return;
        }

        let json: {
          ok?: boolean;
          mealPlan?: MealPlan;
          error?: string;
        };
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          setError("Could not read the meal plan response. Please try again.");
          return;
        }

        if (!res.ok || !json.ok || !json.mealPlan) {
          setError(json.error ?? "Could not generate meal plan.");
          return;
        }
        setPlan(json.mealPlan);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed.");
      }
    });
  }

  const days = extractDays(plan);
  const grocery = extractGrocery(plan);
  const snacks = extractSnacks(plan);
  const summary =
    plan?.plan &&
    typeof plan.plan === "object" &&
    "summary" in plan.plan &&
    typeof (plan.plan as { summary?: unknown }).summary === "string"
      ? (plan.plan as { summary: string }).summary
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
        >
          {pending
            ? "Generating…"
            : plan
              ? "Regenerate plan"
              : "Generate weekly meal plan"}
        </button>
        {plan?.week_start ? (
          <span className="font-sans text-xs text-brand-muted">
            Week of {plan.week_start}
            {plan.model ? ` · ${plan.model}` : ""}
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {!plan && !pending ? (
        <p className="font-sans text-sm text-brand-muted">
          No meal plan yet. Generate one based on your discovery profile
          (goals, allergies, dislikes, and health notes).
        </p>
      ) : null}

      {summary ? (
        <p className="border border-brand-orange/30 bg-brand-orange/5 p-4 font-sans text-sm leading-relaxed text-brand-ink">
          {summary}
        </p>
      ) : null}

      {days.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-brand-ink">7-day plan</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {days.map((day) => (
              <article
                key={day.day}
                className="border border-brand-ink/10 bg-surface-elevated p-4"
              >
                <h3 className="font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange">
                  {day.day}
                </h3>
                <ul className="mt-3 space-y-2 font-sans text-sm text-brand-ink">
                  <li>
                    <span className="font-semibold">Breakfast:</span>{" "}
                    {day.breakfast || "—"}
                  </li>
                  <li>
                    <span className="font-semibold">Lunch:</span>{" "}
                    {day.lunch || "—"}
                  </li>
                  <li>
                    <span className="font-semibold">Dinner:</span>{" "}
                    {day.dinner || "—"}
                  </li>
                </ul>
                {day.notes ? (
                  <p className="mt-2 font-sans text-xs text-brand-muted">
                    {day.notes}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {grocery.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-brand-ink">
            Weekly grocery list
          </h2>
          <ul className="divide-y divide-brand-ink/10 border border-brand-ink/10 bg-surface-elevated">
            {grocery.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 font-sans text-sm"
              >
                <span className="font-semibold text-brand-ink">{item.name}</span>
                <span className="text-brand-muted">
                  {[item.quantity, item.aisle].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snacks.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-brand-ink">
            Healthy snack ideas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {snacks.map((snack, idx) => (
              <div
                key={`${snack.name}-${idx}`}
                className="border border-brand-ink/10 bg-surface-elevated p-4"
              >
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {snack.name}
                </p>
                {snack.description ? (
                  <p className="mt-1 font-sans text-xs leading-relaxed text-brand-muted">
                    {snack.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function extractDays(plan: MealPlan | null): MealDay[] {
  if (!plan?.plan || typeof plan.plan !== "object") return [];
  const days = (plan.plan as { days?: unknown }).days;
  return Array.isArray(days) ? (days as MealDay[]) : [];
}

function extractGrocery(plan: MealPlan | null): GroceryItem[] {
  if (!plan) return [];
  if (Array.isArray(plan.grocery_list)) {
    return plan.grocery_list as GroceryItem[];
  }
  if (plan.plan && typeof plan.plan === "object") {
    const list = (plan.plan as { groceryList?: unknown }).groceryList;
    if (Array.isArray(list)) return list as GroceryItem[];
  }
  return [];
}

function extractSnacks(plan: MealPlan | null): SnackIdea[] {
  if (!plan) return [];
  if (Array.isArray(plan.snacks)) return plan.snacks as SnackIdea[];
  if (plan.plan && typeof plan.plan === "object") {
    const list = (plan.plan as { snacks?: unknown }).snacks;
    if (Array.isArray(list)) return list as SnackIdea[];
  }
  return [];
}
