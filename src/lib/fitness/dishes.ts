import type {
  DishRatingEntry,
  DishRatingsMap,
  DishRecipe,
  FitnessProfile,
  GroceryItem,
} from "@/lib/fitness/types";

export function normalizeDishKey(dish: string): string {
  return dish
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function formatDishRatingsForPrompt(
  ratings: DishRatingsMap | null | undefined,
): string {
  if (!ratings || typeof ratings !== "object") return "none yet";

  const entries = Object.values(ratings)
    .filter((e) => e && typeof e.rating === "number")
    .sort((a, b) => b.rating - a.rating || b.count - a.count);

  if (!entries.length) return "none yet";

  const favorites = entries
    .filter((e) => e.rating >= 4)
    .slice(0, 12)
    .map((e) => `${e.title} (${e.rating}/5)`);
  const lukewarm = entries
    .filter((e) => e.rating === 3)
    .slice(0, 8)
    .map((e) => e.title);
  const disliked = entries
    .filter((e) => e.rating <= 2)
    .slice(0, 12)
    .map((e) => `${e.title} (${e.rating}/5)`);

  return [
    favorites.length
      ? `Favor often (4–5★): ${favorites.join("; ")}`
      : "Favor often: none",
    lukewarm.length
      ? `Use sparingly (3★): ${lukewarm.join("; ")}`
      : "Use sparingly: none",
    disliked.length
      ? `Avoid / rare (1–2★): ${disliked.join("; ")}`
      : "Avoid: none",
  ].join(" | ");
}

export function upsertDishRating(
  existing: DishRatingsMap | null | undefined,
  title: string,
  rating: number,
): DishRatingsMap {
  const key = normalizeDishKey(title);
  const map: DishRatingsMap = { ...(existing ?? {}) };
  const prev = map[key];
  const entry: DishRatingEntry = {
    title: title.trim().slice(0, 200) || prev?.title || key,
    rating,
    count: (prev?.count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
  map[key] = entry;
  return map;
}

export function buildDishRecipePrompt(input: {
  dish: string;
  slot: string;
  day?: string;
  groceryList: GroceryItem[];
  profile: FitnessProfile;
}): string {
  const grocery = input.groceryList
    .slice(0, 40)
    .map((g) =>
      [g.name, g.quantity].filter(Boolean).join(" — "),
    )
    .join("\n");

  return [
    "You are the Vitality Sweat Peak Nutrition recipe coach.",
    "Write a practical home-cook recipe for the member's planned dish.",
    "Prefer ingredients already on their weekly grocery list. Mark those fromGroceryList=true.",
    "You may add a few pantry staples (salt, pepper, oil, spices) if needed.",
    "Respect allergies and disliked foods. Keep steps clear and concise.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      title: "string",
      servings: 2,
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { name: "string", amount: "string", fromGroceryList: true },
      ],
      steps: ["string"],
      tips: "string optional",
    }),
    "",
    `DISH: ${input.dish.slice(0, 240)}`,
    `MEAL SLOT: ${input.slot}`,
    input.day ? `DAY: ${input.day}` : null,
    "",
    "WEEKLY GROCERY LIST (use these first):",
    grocery || "(empty)",
    "",
    "CONSTRAINTS:",
    `- Allergies: ${input.profile.food_allergies.join(", ") || "none"}`,
    `- Disliked foods: ${input.profile.disliked_foods.join(", ") || "none"}`,
    `- Rejected meals: ${(input.profile.meal_rejects ?? []).join(" | ") || "none"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseDishRecipe(raw: string): DishRecipe | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const title =
      typeof parsed.title === "string" ? parsed.title.trim() : "";
    if (!title) return null;

    const ingredientsRaw = Array.isArray(parsed.ingredients)
      ? parsed.ingredients
      : [];
    const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];

    const ingredients = ingredientsRaw
      .filter((i): i is Record<string, unknown> => Boolean(i && typeof i === "object"))
      .map((i) => ({
        name: String(i.name ?? "").trim(),
        amount: typeof i.amount === "string" ? i.amount.trim() : undefined,
        fromGroceryList: Boolean(i.fromGroceryList ?? i.from_grocery_list),
      }))
      .filter((i) => i.name);

    const steps = stepsRaw
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!ingredients.length || !steps.length) return null;

    return {
      title,
      servings:
        typeof parsed.servings === "number" && parsed.servings > 0
          ? Math.round(parsed.servings)
          : undefined,
      prepMinutes:
        typeof parsed.prepMinutes === "number"
          ? Math.round(parsed.prepMinutes)
          : typeof parsed.prep_minutes === "number"
            ? Math.round(parsed.prep_minutes)
            : undefined,
      cookMinutes:
        typeof parsed.cookMinutes === "number"
          ? Math.round(parsed.cookMinutes)
          : typeof parsed.cook_minutes === "number"
            ? Math.round(parsed.cook_minutes)
            : undefined,
      ingredients,
      steps,
      tips: typeof parsed.tips === "string" ? parsed.tips.trim() : undefined,
    };
  } catch {
    return null;
  }
}
