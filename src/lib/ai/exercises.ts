import type { CatalogExerciseSummary } from "@/lib/fitness/exercises";
import type {
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseTrackingType,
} from "@/lib/fitness/types";

export type ResolveExerciseResult =
  | {
      action: "match";
      exerciseId: string;
      reason: string;
    }
  | {
      action: "create";
      name: string;
      aliases: string[];
      category: ExerciseCategory;
      equipment: ExerciseEquipment;
      primaryMuscle: string | null;
      trackingType: ExerciseTrackingType;
      reason: string;
    };

export function buildResolveExercisePrompt(input: {
  query: string;
  equipment?: ExerciseEquipment | null;
  category?: ExerciseCategory | null;
  catalog: CatalogExerciseSummary[];
}): string {
  const catalogBlock = input.catalog
    .slice(0, 250)
    .map((ex) => {
      const alias =
        ex.aliases?.length > 0 ? ` aliases=[${ex.aliases.join("; ")}]` : "";
      return `- id=${ex.id} | ${ex.name} | ${ex.category}/${ex.equipment}${alias}`;
    })
    .join("\n");

  return [
    "You are the Vitality Sweat exercise librarian.",
    "A member typed an exercise name while logging a workout.",
    "Your job: MATCH an existing catalog exercise if it is the same movement under any common name/synonym, OR CREATE a clean new catalog entry.",
    "NEVER invent a duplicate when an equivalent already exists (e.g. \"DB curls\" = Dumbbell Curl, \"RDL\" = Romanian Deadlift, \"bench\" often = Barbell Bench Press when free weight).",
    "Prefer MATCH whenever the movement is clearly the same.",
    "Only CREATE when nothing in the catalog is a reasonable equivalent.",
    "",
    "Return ONLY valid JSON (no markdown fences) with one of these shapes:",
    JSON.stringify({
      action: "match",
      exerciseId: "uuid from catalog",
      reason: "short why it matches",
    }),
    "OR",
    JSON.stringify({
      action: "create",
      name: "Title Case canonical gym name",
      aliases: ["common nicknames"],
      category: "strength|cardio|endurance",
      equipment: "free_weight|machine|bodyweight",
      primaryMuscle: "short muscle or cardio",
      trackingType: "weight_reps|reps_only|duration|distance",
      reason: "short why it is new",
    }),
    "",
    `MEMBER QUERY: ${input.query.slice(0, 120)}`,
    input.equipment ? `PREFERRED EQUIPMENT FILTER: ${input.equipment}` : null,
    input.category ? `PREFERRED CATEGORY FILTER: ${input.category}` : null,
    "",
    "CATALOG (match against these ids/names/aliases):",
    catalogBlock || "(empty)",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseResolveExerciseResult(
  raw: string,
  catalogIds: Set<string>,
): ResolveExerciseResult | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const action = parsed.action;

    if (action === "match") {
      const exerciseId =
        typeof parsed.exerciseId === "string"
          ? parsed.exerciseId.trim()
          : typeof parsed.exercise_id === "string"
            ? parsed.exercise_id.trim()
            : "";
      if (!exerciseId || !catalogIds.has(exerciseId)) return null;
      return {
        action: "match",
        exerciseId,
        reason:
          typeof parsed.reason === "string" ? parsed.reason.trim() : "Matched catalog exercise.",
      };
    }

    if (action === "create") {
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      if (!name) return null;

      const category = parsed.category;
      const equipment = parsed.equipment;
      if (
        category !== "cardio" &&
        category !== "strength" &&
        category !== "endurance"
      ) {
        return null;
      }
      if (
        equipment !== "free_weight" &&
        equipment !== "machine" &&
        equipment !== "bodyweight"
      ) {
        return null;
      }

      let trackingType = parsed.trackingType ?? parsed.tracking_type;
      if (
        trackingType !== "weight_reps" &&
        trackingType !== "reps_only" &&
        trackingType !== "duration" &&
        trackingType !== "distance"
      ) {
        trackingType =
          category === "cardio" || category === "endurance"
            ? "duration"
            : equipment === "bodyweight"
              ? "reps_only"
              : "weight_reps";
      }

      const aliases = Array.isArray(parsed.aliases)
        ? parsed.aliases
            .filter((a): a is string => typeof a === "string")
            .map((a) => a.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

      return {
        action: "create",
        name,
        aliases,
        category,
        equipment,
        primaryMuscle:
          typeof parsed.primaryMuscle === "string"
            ? parsed.primaryMuscle.trim() || null
            : typeof parsed.primary_muscle === "string"
              ? parsed.primary_muscle.trim() || null
              : null,
        trackingType: trackingType as ExerciseTrackingType,
        reason:
          typeof parsed.reason === "string"
            ? parsed.reason.trim()
            : "Added as a new catalog exercise.",
      };
    }

    return null;
  } catch {
    return null;
  }
}
