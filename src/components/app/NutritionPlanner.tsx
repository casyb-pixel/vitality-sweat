"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { normalizeDishKey } from "@/lib/fitness/dishes";
import type {
  DishRatingsMap,
  DishRecipe,
  GroceryItem,
  MealDay,
  MealPlan,
  SnackIdea,
} from "@/lib/fitness/types";

type NutritionPlannerProps = {
  initialPlan: MealPlan | null;
  initialRatings?: DishRatingsMap | null;
};

type SelectedDish = {
  day: string;
  slot: "breakfast" | "lunch" | "dinner";
  dish: string;
};

export default function NutritionPlanner({
  initialPlan,
  initialRatings = null,
}: NutritionPlannerProps) {
  const router = useRouter();
  const whyTitleId = useId();
  const recipeTitleId = useId();
  const [plan, setPlan] = useState<MealPlan | null>(initialPlan);
  const [ratings, setRatings] = useState<DishRatingsMap>(initialRatings ?? {});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dayPending, setDayPending] = useState<string | null>(null);
  const [whyDay, setWhyDay] = useState<MealDay | null>(null);
  const [whyReason, setWhyReason] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedDish, setSelectedDish] = useState<SelectedDish | null>(null);
  const [recipe, setRecipe] = useState<DishRecipe | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);

  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

  useEffect(() => {
    setRatings(initialRatings ?? {});
  }, [initialRatings]);

  useEffect(() => {
    if (!selectedDish || !plan) {
      setRecipe(null);
      return;
    }

    let cancelled = false;
    setRecipeLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/app/meal-plan/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meal_plan_id: plan.id,
            dish: selectedDish.dish,
            slot: selectedDish.slot,
            day: selectedDish.day,
          }),
        });
        const contentType = res.headers.get("content-type") ?? "";
        const raw = await res.text();
        if (
          !contentType.includes("application/json") ||
          raw.trimStart().startsWith("<!")
        ) {
          if (!cancelled) {
            setError("Recipe request timed out or returned an error page.");
            setRecipe(null);
          }
          return;
        }
        const json = JSON.parse(raw) as {
          ok?: boolean;
          recipe?: DishRecipe;
          rating?: number | null;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.recipe) {
          if (!cancelled) {
            setError(json.error ?? "Could not load recipe.");
            setRecipe(null);
          }
          return;
        }
        if (!cancelled) {
          setRecipe(json.recipe);
          if (typeof json.rating === "number") {
            const key = normalizeDishKey(selectedDish.dish);
            setRatings((prev) => ({
              ...prev,
              [key]: {
                title: selectedDish.dish,
                rating: json.rating!,
                count: prev[key]?.count ?? 1,
                updated_at: prev[key]?.updated_at ?? new Date().toISOString(),
              },
            }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Recipe failed.");
          setRecipe(null);
        }
      } finally {
        if (!cancelled) setRecipeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDish, plan]);

  function regenerate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/app/meal-plan", { method: "POST" });
        const contentType = res.headers.get("content-type") ?? "";
        const raw = await res.text();

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

  async function submitDayRegen() {
    if (!plan || !whyDay) return;
    const reason = whyReason.trim();
    if (reason.length < 3) {
      setError("Tell us why you want a different day.");
      return;
    }

    setError(null);
    setMessage(null);
    setDayPending(whyDay.day);

    try {
      const res = await fetch("/api/app/meal-plan/day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_plan_id: plan.id,
          day: whyDay.day,
          reason,
        }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();

      if (
        !contentType.includes("application/json") ||
        raw.trimStart().startsWith("<!")
      ) {
        setError("Day regenerate timed out or returned an error page. Try again.");
        return;
      }

      const json = JSON.parse(raw) as {
        ok?: boolean;
        mealPlan?: MealPlan;
        addedDislikes?: string[];
        error?: string;
      };

      if (!res.ok || !json.ok || !json.mealPlan) {
        setError(json.error ?? "Could not regenerate that day.");
        return;
      }

      setPlan(json.mealPlan);
      setWhyDay(null);
      setWhyReason("");
      const dislikes = json.addedDislikes?.length
        ? ` Saved dislikes: ${json.addedDislikes.join(", ")}.`
        : "";
      setMessage(`Updated ${whyDay.day}.${dislikes}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Day regenerate failed.");
    } finally {
      setDayPending(null);
    }
  }

  async function saveRating(value: number) {
    if (!selectedDish) return;
    setRatingSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/app/meal-plan/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish: selectedDish.dish, rating: value }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        entry?: { title: string; rating: number; count: number; updated_at: string };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.entry) {
        setError(json.error ?? "Could not save rating.");
        return;
      }
      const key = normalizeDishKey(selectedDish.dish);
      setRatings((prev) => ({ ...prev, [key]: json.entry! }));
      setMessage(
        value >= 4
          ? `Loved it — we’ll suggest “${selectedDish.dish}” more often.`
          : value <= 2
            ? `Got it — we’ll suggest “${selectedDish.dish}” less often.`
            : `Rated “${selectedDish.dish}” ${value}/5.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rating failed.");
    } finally {
      setRatingSaving(false);
    }
  }

  function groceryShareUrl(): string | null {
    if (!plan?.grocery_share_token || typeof window === "undefined") return null;
    return `${window.location.origin}/grocery/${plan.grocery_share_token}`;
  }

  async function copyShareLink() {
    const url = groceryShareUrl();
    if (!url) {
      setError("Share link is not ready yet. Regenerate the plan after deploy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setError("Could not copy the share link.");
    }
  }

  async function shareList() {
    const url = groceryShareUrl();
    if (!url) {
      setError("Share link is not ready yet. Regenerate the plan after deploy.");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Vitality Sweat grocery list",
          text: `Grocery list for week of ${plan?.week_start ?? ""}`,
          url,
        });
        return;
      } catch {
        // Fall through to copy.
      }
    }
    await copyShareLink();
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

  const selectedRating = selectedDish
    ? ratings[normalizeDishKey(selectedDish.dish)]?.rating ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={regenerate}
          disabled={pending || Boolean(dayPending)}
          className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
        >
          {pending
            ? "Generating…"
            : plan
              ? "Regenerate full week"
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
      {message ? (
        <p className="font-sans text-sm text-brand-muted">{message}</p>
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
          <p className="font-sans text-xs text-brand-muted">
            Tap a dish for its recipe (built around your grocery list) and rate
            it so we know how often to suggest it.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {days.map((day) => (
              <article
                key={day.day}
                className="border border-brand-ink/10 bg-surface-elevated p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange">
                    {day.day}
                  </h3>
                  <button
                    type="button"
                    disabled={pending || Boolean(dayPending)}
                    onClick={() => {
                      setWhyDay(day);
                      setWhyReason("");
                      setError(null);
                    }}
                    className="shrink-0 font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-ink hover:text-brand-orange disabled:opacity-60"
                  >
                    {dayPending === day.day ? "Updating…" : "Change day"}
                  </button>
                </div>
                <ul className="mt-3 space-y-2 font-sans text-sm text-brand-ink">
                  {(
                    [
                      ["breakfast", day.breakfast],
                      ["lunch", day.lunch],
                      ["dinner", day.dinner],
                    ] as const
                  ).map(([slot, dish]) => (
                    <li key={slot}>
                      <span className="font-semibold capitalize">{slot}:</span>{" "}
                      {dish ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDish({ day: day.day, slot, dish });
                            setError(null);
                            setMessage(null);
                          }}
                          className="text-left text-brand-ink underline decoration-brand-orange/40 underline-offset-2 hover:text-brand-orange hover:decoration-brand-orange"
                        >
                          {dish}
                          {ratings[normalizeDishKey(dish)] ? (
                            <span className="ml-1 text-xs text-brand-muted no-underline">
                              ({ratings[normalizeDishKey(dish)]!.rating}/5)
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        "—"
                      )}
                    </li>
                  ))}
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
        <section id="grocery-list" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl text-brand-ink">
              Weekly grocery list
            </h2>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => void shareList()}
                className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
              >
                {shareCopied ? "Link copied" : "Share list"}
              </button>
              {plan?.grocery_share_token ? (
                <a
                  href={`/grocery/${plan.grocery_share_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
                >
                  Open share page
                </a>
              ) : null}
            </div>
          </div>
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
          <p className="font-sans text-xs text-brand-muted print:hidden">
            Share sends a link your spouse can open without signing in — print
            works from here or the share page.
          </p>
        </section>
      ) : null}

      {snacks.length > 0 ? (
        <section className="space-y-3 print:hidden">
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

      {whyDay ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={whyTitleId}
        >
          <div className="w-full max-w-md border border-brand-ink/10 bg-surface-elevated p-5 shadow-xl">
            <h2
              id={whyTitleId}
              className="font-display text-2xl text-brand-ink"
            >
              Why change {whyDay.day}?
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
              We’ll remember this so those meals (and foods you mention, like
              hummus) don’t come back.
            </p>
            <textarea
              rows={4}
              value={whyReason}
              onChange={(e) => setWhyReason(e.target.value)}
              placeholder="e.g. I don’t like hummus, and that lunch felt too heavy…"
              className="mt-4 w-full border border-brand-ink/15 bg-surface px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={Boolean(dayPending)}
                onClick={() => void submitDayRegen()}
                className="inline-flex min-h-11 flex-1 items-center justify-center bg-brand-orange px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
              >
                {dayPending ? "Updating…" : "Save & regenerate day"}
              </button>
              <button
                type="button"
                disabled={Boolean(dayPending)}
                onClick={() => {
                  setWhyDay(null);
                  setWhyReason("");
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center border border-brand-ink/15 px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDish ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={recipeTitleId}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-brand-ink/10 bg-surface-elevated p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
                  {selectedDish.day} · {selectedDish.slot}
                </p>
                <h2
                  id={recipeTitleId}
                  className="mt-1 font-display text-2xl text-brand-ink"
                >
                  {recipe?.title ?? selectedDish.dish}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDish(null);
                  setRecipe(null);
                }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-brand-ink/15 text-lg text-brand-ink hover:border-brand-orange hover:text-brand-orange"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {recipeLoading ? (
              <p className="mt-6 font-sans text-sm text-brand-muted">
                Building a recipe from your grocery list…
              </p>
            ) : recipe ? (
              <div className="mt-5 space-y-5">
                <p className="font-sans text-xs text-brand-muted">
                  {[
                    recipe.servings ? `Serves ${recipe.servings}` : null,
                    recipe.prepMinutes != null
                      ? `${recipe.prepMinutes} min prep`
                      : null,
                    recipe.cookMinutes != null
                      ? `${recipe.cookMinutes} min cook`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <div>
                  <h3 className="font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-ink">
                    Ingredients
                  </h3>
                  <ul className="mt-2 space-y-1.5 font-sans text-sm text-brand-ink">
                    {recipe.ingredients.map((ing, idx) => (
                      <li key={`${ing.name}-${idx}`}>
                        {ing.amount ? `${ing.amount} ` : ""}
                        {ing.name}
                        {ing.fromGroceryList ? (
                          <span className="ml-1 text-xs text-brand-orange">
                            (on list)
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-ink">
                    Steps
                  </h3>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 font-sans text-sm leading-relaxed text-brand-ink">
                    {recipe.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                {recipe.tips ? (
                  <p className="border border-brand-orange/20 bg-brand-orange/5 p-3 font-sans text-sm text-brand-ink">
                    {recipe.tips}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 font-sans text-sm text-brand-muted">
                No recipe loaded yet.
              </p>
            )}

            <div className="mt-6 border-t border-brand-ink/10 pt-4">
              <p className="font-sans text-sm font-semibold text-brand-ink">
                Rate this dish
              </p>
              <p className="mt-1 font-sans text-xs text-brand-muted">
                Higher ratings show up more often in future plans; low ratings
                show up less.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={ratingSaving}
                    onClick={() => void saveRating(n)}
                    className={`min-h-10 min-w-10 rounded-md border px-3 py-2 font-sans text-sm font-bold ${
                      selectedRating === n
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                    } disabled:opacity-60`}
                    aria-label={`Rate ${n} out of 5`}
                  >
                    {n}★
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
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
