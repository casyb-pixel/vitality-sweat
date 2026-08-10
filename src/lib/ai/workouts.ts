import type {
  FitnessProfile,
  PreferredSplit,
  PrimaryGoal,
  TrainingPreferences,
  WorkoutSetStyle,
} from "@/lib/fitness/types";
import {
  FITNESS_LEVEL_LABELS,
  PREFERRED_SPLIT_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/fitness/types";
import { ageFromBirthdate } from "@/lib/fitness/profile";
import {
  NO_EM_DASH_RULE,
  stripEmDashesDeep,
} from "@/lib/text/humanize-copy";

export type WorkoutPlanExerciseDraft = {
  name: string;
  sets: number;
  repMin: number | null;
  repMax: number | null;
  setStyle: WorkoutSetStyle;
  restSec: number | null;
  coachNotes: string | null;
};

export type WorkoutPlanDayDraft = {
  dayIndex: number;
  label: string;
  focus: string | null;
  estimatedMinutes: number | null;
  exercises: WorkoutPlanExerciseDraft[];
};

export type WorkoutPlanPayload = {
  summary: string;
  days: WorkoutPlanDayDraft[];
};

const SET_STYLES = new Set<string>([
  "strength_heavy",
  "hypertrophy",
  "endurance_light",
  "metabolic",
]);

/** Map primary goal → dominant set style for the prompt and parser fallbacks. */
export function setStyleForGoal(goal: PrimaryGoal | null | undefined): WorkoutSetStyle {
  switch (goal) {
    case "strength":
      return "strength_heavy";
    case "muscle_gain":
      return "hypertrophy";
    case "weight_loss":
      return "metabolic";
    case "endurance":
    case "marathon_training":
      return "endurance_light";
    case "sports_training":
      return "hypertrophy";
    case "general_fitness":
    default:
      return "hypertrophy";
  }
}

export function defaultRepRangeForStyle(style: WorkoutSetStyle): {
  repMin: number;
  repMax: number;
} {
  switch (style) {
    case "strength_heavy":
      return { repMin: 3, repMax: 6 };
    case "hypertrophy":
      return { repMin: 8, repMax: 12 };
    case "metabolic":
      return { repMin: 12, repMax: 20 };
    case "endurance_light":
      return { repMin: 12, repMax: 20 };
  }
}

function goalTrainingCoaching(goal: PrimaryGoal | null | undefined): string {
  switch (goal) {
    case "strength":
      return "Bias setStyle to strength_heavy with low reps (about 3-6) and longer rest.";
    case "muscle_gain":
      return "Bias setStyle to hypertrophy with 8-12 reps and moderate rest.";
    case "weight_loss":
      return "Bias setStyle to metabolic with higher reps (about 12-20), shorter rest, and denser sessions.";
    case "endurance":
    case "marathon_training":
      return "Bias setStyle to endurance_light with higher reps, controlled tempo, and sustainable volume.";
    case "sports_training":
      return "Mix hypertrophy and strength_heavy; keep sessions athletic and movement-quality focused.";
    default:
      return "Use hypertrophy as the default setStyle with balanced full-body or split work.";
  }
}

function normalizeSetStyle(
  value: unknown,
  fallback: WorkoutSetStyle,
): WorkoutSetStyle {
  if (typeof value === "string" && SET_STYLES.has(value)) {
    return value as WorkoutSetStyle;
  }
  return fallback;
}

function positiveInt(value: unknown, fallback: number | null = null): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

/**
 * Build a concise Gemini prompt for a multi-day workout program.
 * Prefer exact catalog exercise names so resolve can match without creating duplicates.
 */
export function buildWorkoutPlanPrompt(
  profile: FitnessProfile,
  prefs: TrainingPreferences,
  catalogNames: string[],
): string {
  const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "unspecified";
  const goal = profile.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "General fitness";
  const days =
    prefs.days_per_week && prefs.days_per_week >= 1 && prefs.days_per_week <= 7
      ? prefs.days_per_week
      : 3;
  const minutes =
    prefs.session_minutes && prefs.session_minutes >= 5
      ? prefs.session_minutes
      : 45;
  const split: PreferredSplit | null = prefs.preferred_split;
  const splitLabel = split ? PREFERRED_SPLIT_LABELS[split] : "Let AI choose";
  const styleHint = goalTrainingCoaching(profile.primary_goal);
  const catalogBlock = catalogNames.slice(0, 120).join(" | ");

  return [
    "You are the Vitality Sweat Peak Training coach.",
    "Build a practical workout program for this member using their goal, level, and training preferences.",
    "No medical claims. Frame guidance as coaching suggestions. Respect avoidances and activity restrictions.",
    NO_EM_DASH_RULE,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      summary: "string: 1-2 sentences on how the plan fits their goal",
      days: [
        {
          dayIndex: 0,
          label: "Day 1 - Upper",
          focus: "string",
          estimatedMinutes: 45,
          exercises: [
            {
              name: "Barbell Bench Press",
              sets: 3,
              repMin: 8,
              repMax: 12,
              setStyle: "hypertrophy",
              restSec: 90,
              coachNotes: "string optional",
            },
          ],
        },
      ],
    }),
    "",
    "Rules:",
    `- Exactly ${days} days (dayIndex 0 through ${days - 1}).`,
    `- Each day about ${minutes} minutes (estimatedMinutes near ${minutes}).`,
    "- 4-8 exercises per day. Prefer compound lifts, then accessories.",
    "- Prefer EXACT names from CATALOG below. Do not invent obscure variations when a catalog name fits.",
    "- setStyle must be one of: strength_heavy, hypertrophy, endurance_light, metabolic.",
    `- ${styleHint}`,
    "- Prefer split: " + splitLabel + ".",
    "- Keep coachNotes to one short coaching cue when useful; otherwise null.",
    "",
    "MEMBER:",
    `- Sex: ${profile.sex ?? "unspecified"}`,
    `- Age: ${age ?? "unspecified"}`,
    `- Fitness level: ${level}`,
    `- Primary goal: ${goal}`,
    `- Equipment: ${prefs.equipment.join(", ") || "unspecified"}`,
    `- Focus muscles: ${prefs.focus_muscles.join(", ") || "balanced"}`,
    `- Avoidances: ${prefs.avoidances?.trim() || "none"}`,
    `- Activity restrictions: ${profile.activity_restrictions?.trim() || "none"}`,
    `- Health conditions: ${profile.health_conditions.join(", ") || "none listed"}`,
    "",
    "CATALOG (prefer these exact names):",
    catalogBlock || "(empty)",
  ].join("\n");
}

export type BonusOverlapContext = {
  recentMuscles: string[];
  recentDayFocuses: string[];
  upcomingScheduled: Array<{ label: string; focus: string | null }>;
  completedScheduledThisWeek: Array<{ label: string; focus: string | null }>;
  focusHint?: string | null;
  minutes: number;
  equipment?: string[];
};

export type BonusDayPayload = {
  summary: string;
  label: string;
  focus: string | null;
  estimatedMinutes: number | null;
  exercises: WorkoutPlanExerciseDraft[];
};

/**
 * One-off bonus session that must not alter the mapped weekly plan.
 * Avoids primary overlap with recent work and the next scheduled day.
 */
export function buildBonusDayPrompt(
  profile: FitnessProfile,
  prefs: TrainingPreferences,
  catalogNames: string[],
  overlap: BonusOverlapContext,
): string {
  const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "unspecified";
  const goal = profile.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "General fitness";
  const minutes = overlap.minutes >= 5 ? overlap.minutes : 45;
  const equipment =
    overlap.equipment && overlap.equipment.length > 0
      ? overlap.equipment
      : prefs.equipment;
  const catalogBlock = catalogNames.slice(0, 120).join(" | ");

  return [
    "You are the Vitality Sweat Peak Training coach.",
    "Build ONE bonus / extra workout session for today.",
    "This is NOT part of their mapped weekly plan. Do not renumber or replace scheduled days.",
    "No medical claims. Coaching suggestions only.",
    NO_EM_DASH_RULE,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      summary:
        "string: 1-2 sentences explaining the bonus session and why it fits recovery gaps",
      label: "Extra - Mobility & Core",
      focus: "string primary focus",
      estimatedMinutes: minutes,
      exercises: [
        {
          name: "Plank",
          sets: 3,
          repMin: 8,
          repMax: 12,
          setStyle: "endurance_light",
          restSec: 60,
          coachNotes: "string optional",
        },
      ],
    }),
    "",
    "Rules:",
    `- About ${minutes} minutes. 4-7 exercises.`,
    "- Prefer EXACT names from CATALOG.",
    "- setStyle must be one of: strength_heavy, hypertrophy, endurance_light, metabolic.",
    "- Avoid primary emphasis on muscles heavily trained recently:",
    `  recent muscles: ${overlap.recentMuscles.join(", ") || "none"}`,
    `  recent day focuses: ${overlap.recentDayFocuses.join(", ") || "none"}`,
    "- Also avoid making the same primary focus as the next upcoming scheduled day:",
    overlap.upcomingScheduled.length
      ? overlap.upcomingScheduled
          .map((d) => `  - ${d.label}: ${d.focus ?? "unspecified"}`)
          .join("\n")
      : "  - none listed",
    "- Prefer gaps vs already-completed scheduled days this week:",
    overlap.completedScheduledThisWeek.length
      ? overlap.completedScheduledThisWeek
          .map((d) => `  - ${d.label}: ${d.focus ?? "unspecified"}`)
          .join("\n")
      : "  - none yet",
    "- If no safe strength slot remains, choose conditioning, mobility, or core and say why in summary.",
    overlap.focusHint?.trim()
      ? `- Member focus hint (honor if it does not clash with overlap rules): ${overlap.focusHint.trim()}`
      : "- No extra focus hint from the member.",
    "",
    "MEMBER:",
    `- Sex: ${profile.sex ?? "unspecified"}`,
    `- Age: ${age ?? "unspecified"}`,
    `- Fitness level: ${level}`,
    `- Primary goal: ${goal}`,
    `- Equipment: ${equipment.join(", ") || "unspecified"}`,
    `- Avoidances: ${prefs.avoidances?.trim() || "none"}`,
    `- Activity restrictions: ${profile.activity_restrictions?.trim() || "none"}`,
    "",
    "CATALOG (prefer these exact names):",
    catalogBlock || "(empty)",
  ].join("\n");
}

export function parseBonusDayPayload(
  raw: string,
  opts?: { fallbackStyle?: WorkoutSetStyle; minutes?: number },
): BonusDayPayload | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const fallbackStyle = opts?.fallbackStyle ?? "hypertrophy";

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    // Accept either a single day object or { days: [one] }.
    const dayRaw =
      parsed.exercises && typeof parsed === "object"
        ? parsed
        : Array.isArray(parsed.days) &&
            parsed.days[0] &&
            typeof parsed.days[0] === "object"
          ? (parsed.days[0] as Record<string, unknown>)
          : null;
    if (!dayRaw) return null;

    const exercisesRaw = Array.isArray(dayRaw.exercises) ? dayRaw.exercises : [];
    const exercises: WorkoutPlanExerciseDraft[] = exercisesRaw
      .filter(
        (ex): ex is Record<string, unknown> =>
          Boolean(ex && typeof ex === "object"),
      )
      .map((ex) => {
        const style = normalizeSetStyle(
          ex.setStyle ?? ex.set_style,
          fallbackStyle,
        );
        const defaults = defaultRepRangeForStyle(style);
        const sets = positiveInt(ex.sets, 3) ?? 3;
        let repMin = positiveInt(ex.repMin ?? ex.rep_min, defaults.repMin);
        let repMax = positiveInt(ex.repMax ?? ex.rep_max, defaults.repMax);
        if (repMin != null && repMax != null && repMax < repMin) {
          [repMin, repMax] = [repMax, repMin];
        }
        return {
          name: String(ex.name ?? "").trim(),
          sets: Math.min(Math.max(sets, 1), 10),
          repMin,
          repMax,
          setStyle: style,
          restSec: positiveInt(ex.restSec ?? ex.rest_sec, null),
          coachNotes:
            typeof ex.coachNotes === "string"
              ? ex.coachNotes.trim() || null
              : typeof ex.coach_notes === "string"
                ? ex.coach_notes.trim() || null
                : null,
        };
      })
      .filter((ex) => ex.name.length >= 2);

    if (exercises.length < 1) return null;

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : typeof dayRaw.summary === "string" && dayRaw.summary.trim()
          ? dayRaw.summary.trim()
          : "Extra session built around recovery gaps so your mapped plan stays intact.";

    return stripEmDashesDeep({
      summary,
      label:
        String(dayRaw.label ?? "Extra session").trim() || "Extra session",
      focus:
        typeof dayRaw.focus === "string" ? dayRaw.focus.trim() || null : null,
      estimatedMinutes:
        positiveInt(
          dayRaw.estimatedMinutes ?? dayRaw.estimated_minutes,
          opts?.minutes ?? 45,
        ) ?? opts?.minutes ?? 45,
      exercises,
    });
  } catch {
    return null;
  }
}

export function parseWorkoutPlanPayload(
  raw: string,
  opts?: { expectedDays?: number; fallbackStyle?: WorkoutSetStyle },
): WorkoutPlanPayload | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const fallbackStyle = opts?.fallbackStyle ?? "hypertrophy";
  const expectedDays = opts?.expectedDays;

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const daysRaw = Array.isArray(parsed.days) ? parsed.days : [];
    if (daysRaw.length < 1) return null;

    const days: WorkoutPlanDayDraft[] = daysRaw
      .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === "object"))
      .map((row, index) => {
        const exercisesRaw = Array.isArray(row.exercises) ? row.exercises : [];
        const exercises: WorkoutPlanExerciseDraft[] = exercisesRaw
          .filter(
            (ex): ex is Record<string, unknown> =>
              Boolean(ex && typeof ex === "object"),
          )
          .map((ex) => {
            const style = normalizeSetStyle(
              ex.setStyle ?? ex.set_style,
              fallbackStyle,
            );
            const defaults = defaultRepRangeForStyle(style);
            const sets = positiveInt(ex.sets, 3) ?? 3;
            let repMin = positiveInt(ex.repMin ?? ex.rep_min, defaults.repMin);
            let repMax = positiveInt(ex.repMax ?? ex.rep_max, defaults.repMax);
            if (repMin != null && repMax != null && repMax < repMin) {
              [repMin, repMax] = [repMax, repMin];
            }
            return {
              name: String(ex.name ?? "").trim(),
              sets: Math.min(Math.max(sets, 1), 10),
              repMin,
              repMax,
              setStyle: style,
              restSec: positiveInt(ex.restSec ?? ex.rest_sec, null),
              coachNotes:
                typeof ex.coachNotes === "string"
                  ? ex.coachNotes.trim() || null
                  : typeof ex.coach_notes === "string"
                    ? ex.coach_notes.trim() || null
                    : null,
            };
          })
          .filter((ex) => ex.name.length >= 2);

        return {
          dayIndex:
            Number.isInteger(Number(row.dayIndex ?? row.day_index))
              ? Number(row.dayIndex ?? row.day_index)
              : index,
          label: String(row.label ?? `Day ${index + 1}`).trim() || `Day ${index + 1}`,
          focus:
            typeof row.focus === "string" ? row.focus.trim() || null : null,
          estimatedMinutes: positiveInt(
            row.estimatedMinutes ?? row.estimated_minutes,
            null,
          ),
          exercises,
        };
      })
      .filter((day) => day.exercises.length > 0);

    if (days.length < 1) return null;
    if (expectedDays && days.length < Math.min(expectedDays, 1)) return null;

    // Normalize dayIndex to 0..n-1 in order.
    const normalized = days
      .slice(0, expectedDays ?? days.length)
      .map((day, index) => ({ ...day, dayIndex: index }));

    return stripEmDashesDeep({
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Custom training plan aligned to your goal.",
      days: normalized,
    });
  } catch {
    return null;
  }
}
