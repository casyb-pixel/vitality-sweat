import type {
  FitnessProfile,
  GroceryItem,
  MealDay,
  MealPlanPayload,
} from "@/lib/fitness/types";
import {
  FITNESS_LEVEL_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/fitness/types";
import { ageFromBirthdate } from "@/lib/fitness/profile";

function profileContext(profile: FitnessProfile): string[] {
  const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "unspecified";
  const goal = profile.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "general fitness";
  const rejects = profile.meal_rejects ?? [];

  return [
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
    `- Rejected meals (never repeat): ${rejects.join(" | ") || "none"}`,
  ];
}

export function buildMealPlanPrompt(profile: FitnessProfile): string {
  return [
    "You are the Vitality Sweat Peak Nutrition coach for Southwest Louisiana athletes and families.",
    "Build a practical 7-day meal plan that fuels performance without ignoring real life (budget, leftovers, simple cooking).",
    "Respect food allergies strictly. Avoid disliked foods. Never repeat rejected meals. Account for health conditions and activity restrictions.",
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
    ...profileContext(profile),
  ].join("\n");
}

export function buildDayRegenPrompt(input: {
  profile: FitnessProfile;
  dayName: string;
  previousDay: MealDay;
  reason: string;
  otherDays: MealDay[];
}): string {
  return [
    "You are the Vitality Sweat Peak Nutrition coach.",
    `Replace ONLY the ${input.dayName} meals for this member.`,
    "They disliked the previous day and explained why — honor that feedback.",
    "Do NOT repeat the rejected meals. Avoid disliked foods and allergies.",
    "Keep the new day aligned with the rest of the week (variety, leftovers when sensible).",
    "",
    "Also extract any specific foods/ingredients they dislike from their reason",
    "(e.g. \"I don't like hummus\" → hummus). Return them in dislikedFoods.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      day: {
        day: input.dayName,
        breakfast: "string",
        lunch: "string",
        dinner: "string",
        notes: "string optional",
      },
      dislikedFoods: ["hummus"],
      rejectedMealLabels: [
        "short label of breakfast that was rejected",
        "short label of lunch that was rejected",
        "short label of dinner that was rejected",
      ],
      groceryDelta: [
        {
          name: "string",
          quantity: "string optional",
          aisle: "string optional",
          action: "add",
        },
      ],
    }),
    "",
    "Rules:",
    `- day.day must be exactly "${input.dayName}".`,
    "- dislikedFoods: only concrete food names mentioned or clearly implied (lowercase).",
    "- rejectedMealLabels: 1–3 short phrases capturing what to never serve again.",
    "- groceryDelta: ingredients to ADD for the new day (action always \"add\"). Keep short.",
    "- One concise sentence per meal.",
    "",
    ...profileContext(input.profile),
    "",
    `WHY THEY WANT A NEW ${input.dayName.toUpperCase()}:`,
    input.reason.slice(0, 1000),
    "",
    "PREVIOUS DAY (do not repeat):",
    JSON.stringify(input.previousDay),
    "",
    "OTHER DAYS THIS WEEK (for variety context):",
    JSON.stringify(input.otherDays),
  ].join("\n");
}

export type DayRegenPayload = {
  day: MealDay;
  dislikedFoods: string[];
  rejectedMealLabels: string[];
  groceryDelta: GroceryItem[];
};

export function parseDayRegenPayload(raw: string): DayRegenPayload | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const dayRaw = parsed.day;
    if (!dayRaw || typeof dayRaw !== "object") return null;
    const row = dayRaw as Record<string, unknown>;
    const day: MealDay = {
      day: String(row.day ?? "").trim() || "Day",
      breakfast: String(row.breakfast ?? "").trim(),
      lunch: String(row.lunch ?? "").trim(),
      dinner: String(row.dinner ?? "").trim(),
      notes: typeof row.notes === "string" ? row.notes.trim() : undefined,
    };
    if (!day.breakfast && !day.lunch && !day.dinner) return null;

    const dislikedFoods = asStringArray(
      parsed.dislikedFoods ?? parsed.disliked_foods,
    ).map((f) => f.toLowerCase());

    const rejectedMealLabels = asStringArray(
      parsed.rejectedMealLabels ?? parsed.rejected_meal_labels,
    );

    const deltaRaw = Array.isArray(parsed.groceryDelta)
      ? parsed.groceryDelta
      : Array.isArray(parsed.grocery_delta)
        ? parsed.grocery_delta
        : [];

    const groceryDelta: GroceryItem[] = deltaRaw
      .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === "object"))
      .map((g) => ({
        name: String(g.name ?? "").trim(),
        quantity:
          typeof g.quantity === "string" ? g.quantity.trim() : undefined,
        aisle: typeof g.aisle === "string" ? g.aisle.trim() : undefined,
      }))
      .filter((g) => g.name);

    return { day, dislikedFoods, rejectedMealLabels, groceryDelta };
  } catch {
    return null;
  }
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

export function mergeGroceryLists(
  existing: GroceryItem[],
  additions: GroceryItem[],
): GroceryItem[] {
  const map = new Map<string, GroceryItem>();
  for (const item of [...existing, ...additions]) {
    const key = item.name.trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { ...item, name: item.name.trim() });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function mergeUniqueStrings(
  existing: string[],
  incoming: string[],
  max = 60,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...existing, ...incoming]) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
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

export function asMealPlanPayload(
  plan: MealPlanPayload | Record<string, unknown> | null | undefined,
): MealPlanPayload | null {
  if (!plan || typeof plan !== "object") return null;
  const days = Array.isArray((plan as MealPlanPayload).days)
    ? (plan as MealPlanPayload).days
    : [];
  if (!days.length) return null;
  const groceryList = Array.isArray((plan as MealPlanPayload).groceryList)
    ? (plan as MealPlanPayload).groceryList
    : [];
  const snacks = Array.isArray((plan as MealPlanPayload).snacks)
    ? (plan as MealPlanPayload).snacks
    : [];
  return {
    summary:
      typeof (plan as MealPlanPayload).summary === "string"
        ? (plan as MealPlanPayload).summary
        : undefined,
    days,
    groceryList,
    snacks,
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}
