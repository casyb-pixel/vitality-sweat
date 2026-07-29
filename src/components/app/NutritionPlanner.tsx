"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
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
  const whyTitleId = useId();
  const [plan, setPlan] = useState<MealPlan | null>(initialPlan);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dayPending, setDayPending] = useState<string | null>(null);
  const [whyDay, setWhyDay] = useState<MealDay | null>(null);
  const [whyReason, setWhyReason] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

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
