import type { FitnessProfile, MealPlanPayload } from "@/lib/fitness/types";
import {
  FITNESS_LEVEL_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/fitness/types";
import { ageFromBirthdate } from "@/lib/fitness/profile";

export function buildMealPlanPrompt(profile: FitnessProfile): string {
  const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "unspecified";
  const goal = profile.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "general fitness";

  return [
    "You are the Vitality Sweat Peak Nutrition coach for Southwest Louisiana athletes and families.",
    "Build a practical 7-day meal plan that fuels performance without ignoring real life (budget, leftovers, simple cooking).",
    "Respect food allergies strictly. Avoid disliked foods. Account for health conditions and activity restrictions.",
    "Prefer heart-healthy, whole-food meals. No medical claims — frame as coaching suggestions.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      summary: "string — 1–2 sentences on how the plan fits their goal",
      days: [
        {
          day: "Monday",
          breakfast: "string",
          lunch: "string",
          dinner: "string",
          notes: "string optional",
        },
      ],
      groceryList: [
        { name: "string", quantity: "string optional", aisle: "string optional" },
      ],
      snacks: [{ name: "string", description: "string optional" }],
    }),
    "",
    "Rules:",
    "- Exactly 7 days (Monday–Sunday).",
    "- groceryList should cover the week (consolidate duplicates, max ~25 items).",
    "- Include 5–6 healthy snack ideas.",
    "- Keep meals specific enough to shop for (not just 'protein + veggies').",
    "- Keep each meal description to one concise sentence — prefer speed and clarity.",
    "",
    "MEMBER PROFILE:",
    `- Sex: ${profile.sex ?? "unspecified"}`,
    `- Age: ${age ?? "unspecified"}`,
    `- Weight: ${profile.weight_lb ?? "unspecified"} lb`,
    `- Target weight: ${profile.target_weight_lb ?? "none"} lb`,
    `- Fitness level: ${level}`,
    `- Primary goal: ${goal}`,
    `- Disliked foods: ${profile.disliked_foods.join(", ") || "none listed"}`,
    `- Food allergies: ${profile.food_allergies.join(", ") || "none listed"}`,
    `- Health conditions: ${profile.health_conditions.join(", ") || "none listed"}`,
    `- Activity restrictions: ${profile.activity_restrictions?.trim() || "none"}`,
  ].join("\n");
}

export function parseMealPlanPayload(raw: string): MealPlanPayload | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<MealPlanPayload> & {
      grocery_list?: unknown;
    };

    const days = Array.isArray(parsed.days) ? parsed.days : [];
    const groceryList = Array.isArray(parsed.groceryList)
      ? parsed.groceryList
      : Array.isArray(parsed.grocery_list)
        ? parsed.grocery_list
        : [];
    const snacks = Array.isArray(parsed.snacks) ? parsed.snacks : [];

    if (days.length < 1) return null;

    return {
      summary:
        typeof parsed.summary === "string" ? parsed.summary.trim() : undefined,
      days: days
        .filter((d): d is NonNullable<typeof d> => Boolean(d && typeof d === "object"))
        .map((d) => {
          const row = d as Record<string, unknown>;
          return {
            day: String(row.day ?? "").trim() || "Day",
            breakfast: String(row.breakfast ?? "").trim(),
            lunch: String(row.lunch ?? "").trim(),
            dinner: String(row.dinner ?? "").trim(),
            notes:
              typeof row.notes === "string" ? row.notes.trim() : undefined,
          };
        }),
      groceryList: groceryList
        .filter((g): g is NonNullable<typeof g> => Boolean(g && typeof g === "object"))
        .map((g) => {
          const row = g as Record<string, unknown>;
          return {
            name: String(row.name ?? "").trim(),
            quantity:
              typeof row.quantity === "string" ? row.quantity.trim() : undefined,
            aisle: typeof row.aisle === "string" ? row.aisle.trim() : undefined,
          };
        })
        .filter((g) => g.name),
      snacks: snacks
        .filter((s): s is NonNullable<typeof s> => Boolean(s && typeof s === "object"))
        .map((s) => {
          const row = s as Record<string, unknown>;
          return {
            name: String(row.name ?? "").trim(),
            description:
              typeof row.description === "string"
                ? row.description.trim()
                : undefined,
          };
        })
        .filter((s) => s.name),
    };
  } catch {
    return null;
  }
}

export function startOfWeekISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
