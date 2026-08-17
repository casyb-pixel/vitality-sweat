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

/** Safer exercise selection when equipment is thin or member is a beginner. */
function safetyTrainingGuards(
  profile: FitnessProfile,
  equipment: string[],
): string[] {
  const rules: string[] = [];
  const eq = equipment.map((e) => e.trim().toLowerCase()).filter(Boolean);
  const limited =
    eq.length === 0 ||
    eq.every((e) => e === "bodyweight" || e === "bands" || e === "home");

  if (eq.length === 0) {
    rules.push(
      "- Equipment is unspecified: prefer versatile bodyweight, dumbbell, and machine patterns. Avoid barbell-only exotic lifts.",
    );
  } else if (limited) {
    rules.push(
      "- Equipment is limited: prefer bodyweight, bands, dumbbells, and simple machines. Avoid barbell-only or specialized exotic lifts.",
    );
  }

  if (profile.fitness_level === "beginner") {
    rules.push(
      "- Beginner: use safe foundational compounds (squat pattern, hinge, push, pull, core). Avoid advanced variations (deficit, snatch-grip, kipping, extreme ROM tricks). Keep accessories simple and well-known.",
    );
  }

  return rules;
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
  const safety = safetyTrainingGuards(profile, prefs.equipment);

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
    ...safety,
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
  const safety = safetyTrainingGuards(profile, equipment);

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
    ...safety,
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

export type DayRegenContext = {
  currentLabel: string;
  currentFocus: string | null;
  dayIndex: number | null;
  minutes: number;
  otherScheduled: Array<{ label: string; focus: string | null }>;
};

/**
 * Regenerate ONE scheduled workout day without touching other days or days_per_week.
 */
export function buildWorkoutDayRegenPrompt(
  profile: FitnessProfile,
  prefs: TrainingPreferences,
  catalogNames: string[],
  ctx: DayRegenContext,
): string {
  const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "unspecified";
  const goal = profile.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "General fitness";
  const minutes = ctx.minutes >= 5 ? ctx.minutes : 45;
  const styleHint = goalTrainingCoaching(profile.primary_goal);
  const catalogBlock = catalogNames.slice(0, 120).join(" | ");
  const safety = safetyTrainingGuards(profile, prefs.equipment);

  return [
    "You are the Vitality Sweat Peak Training coach.",
    "Regenerate ONE scheduled workout day for this member.",
    "Do NOT redesign the whole week. Do NOT change how many days are in the program.",
    "No medical claims. Coaching suggestions only.",
    NO_EM_DASH_RULE,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      summary: "string: 1-2 sentences on this day's role in the plan",
      label: ctx.currentLabel || "Day",
      focus: ctx.currentFocus || "full body",
      estimatedMinutes: minutes,
      exercises: [
        {
          name: "Goblet Squat",
          sets: 3,
          repMin: 8,
          repMax: 12,
          setStyle: "hypertrophy",
          restSec: 90,
          coachNotes: "string optional",
        },
      ],
    }),
    "",
    "Rules:",
    `- About ${minutes} minutes. 4-8 exercises.`,
    "- Prefer EXACT names from CATALOG.",
    "- setStyle must be one of: strength_heavy, hypertrophy, endurance_light, metabolic.",
    `- ${styleHint}`,
    `- Keep a clear day focus. Current day was: ${ctx.currentLabel} (${ctx.currentFocus ?? "unspecified"}).`,
    "- Complement other scheduled days (do not duplicate their primary focus when avoidable):",
    ctx.otherScheduled.length
      ? ctx.otherScheduled
          .map((d) => `  - ${d.label}: ${d.focus ?? "unspecified"}`)
          .join("\n")
      : "  - none listed",
    "- Prefer compound lifts, then accessories.",
    ...safety,
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
    "",
    "CATALOG (prefer these exact names):",
    catalogBlock || "(empty)",
  ].join("\n");
}

/** Day regen uses the same single-day JSON shape as bonus sessions. */
export function parseWorkoutDayRegenPayload(
  raw: string,
  opts?: { fallbackStyle?: WorkoutSetStyle; minutes?: number },
): BonusDayPayload | null {
  return parseBonusDayPayload(raw, opts);
}

export type WorkoutEvaluatePayload = {
  summary: string;
  working: string[];
  gaps: string[];
  tweaks: string[];
};

export function buildWorkoutEvaluatePrompt(input: {
  profile: FitnessProfile;
  prefs: TrainingPreferences;
  programSummary: string | null;
  origin: string | null;
  days: Array<{
    label: string;
    focus: string | null;
    exercises: Array<{ name: string; sets: number; repMin: number | null; repMax: number | null }>;
  }>;
  recentSessions: Array<{
    startedAt: string;
    status: string;
    exercises: Array<{
      name: string;
      sets: number;
      bestWeightLb: number | null;
      bestReps: number | null;
      distanceM: number | null;
    }>;
  }>;
  weighIns: Array<{ recordedOn: string; weightLb: number }>;
  measurements: Array<{ recordedOn: string; chestIn: number | null; bicepIn: number | null; waistIn: number | null; thighIn: number | null }>;
}): string {
  const { profile, prefs } = input;
  const age = profile.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const goal = profile.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "General fitness";
  const safety = safetyTrainingGuards(profile, prefs.equipment);
  const planBlock = input.days
    .map((day) => {
      const moves = day.exercises
        .map(
          (ex) =>
            `    - ${ex.name}: ${ex.sets} sets ${ex.repMin ?? "?"}-${ex.repMax ?? "?"} reps`,
        )
        .join("\n");
      return `  ${day.label} (${day.focus ?? "unspecified"}):\n${moves || "    - empty day"}`;
    })
    .join("\n");
  const historyBlock = input.recentSessions.length
    ? input.recentSessions
        .slice(0, 8)
        .map((session) => {
          const moves = session.exercises
            .map((ex) => {
              const lift =
                ex.bestWeightLb != null
                  ? `${ex.bestWeightLb} lb x ${ex.bestReps ?? "?"}`
                  : ex.distanceM != null
                    ? `${ex.distanceM} m`
                    : `${ex.sets} sets`;
              return `${ex.name} (${lift})`;
            })
            .join("; ");
          return `  - ${session.startedAt.slice(0, 10)} ${session.status}: ${moves || "no sets"}`;
        })
        .join("\n")
    : "  - none yet. Comment on the written split and ask them to log sessions.";

  return [
    "You are the Vitality Sweat Peak Training coach reviewing a member-owned workout split.",
    "Do not rewrite or replace their program. Evaluate it and suggest optional tweaks.",
    "No medical claims. Frame guidance as coaching suggestions.",
    NO_EM_DASH_RULE,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      summary: "string: 2-4 sentences on how the split fits their goal and logged work",
      working: ["string: what is working"],
      gaps: ["string: missing patterns, recovery, or stalled lifts"],
      tweaks: ["string: optional next tweak they can apply themselves"],
    }),
    "",
    "Rules:",
    "- Keep working, gaps, and tweaks to 1-3 short items each.",
    "- If history is thin, say so plainly and still comment on the written split.",
    "- Do not invent load numbers. Speak in patterns, volume, and next-session ideas.",
    ...safety,
    "",
    "MEMBER:",
    `- Age: ${age ?? "unspecified"}`,
    `- Fitness level: ${profile.fitness_level ?? "unspecified"}`,
    `- Primary goal: ${goal}`,
    `- Equipment: ${prefs.equipment.join(", ") || "unspecified"}`,
    `- Avoidances: ${prefs.avoidances?.trim() || "none"}`,
    `- Restrictions: ${profile.activity_restrictions?.trim() || "none"}`,
    "",
    `PROGRAM origin: ${input.origin ?? "unknown"}`,
    `Summary: ${input.programSummary ?? "none"}`,
    planBlock || "  (empty program)",
    "",
    "RECENT SESSIONS:",
    historyBlock,
    "",
    "WEIGH-INS:",
    input.weighIns.length
      ? input.weighIns
          .slice(0, 6)
          .map((w) => `  - ${w.recordedOn}: ${w.weightLb} lb`)
          .join("\n")
      : "  - none",
    "",
    "TAPE (if any):",
    input.measurements.length
      ? input.measurements
          .slice(0, 4)
          .map(
            (m) =>
              `  - ${m.recordedOn}: chest ${m.chestIn ?? "-"}, biceps ${m.bicepIn ?? "-"}, waist ${m.waistIn ?? "-"}, thigh ${m.thighIn ?? "-"}`,
          )
          .join("\n")
      : "  - none",
  ].join("\n");
}

export function parseWorkoutEvaluatePayload(raw: string): WorkoutEvaluatePayload | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) return null;
    const asList = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];
    return stripEmDashesDeep({
      summary,
      working: asList(parsed.working),
      gaps: asList(parsed.gaps),
      tweaks: asList(parsed.tweaks),
    });
  } catch {
    return null;
  }
}

export type WorkoutStartCoachCopy = {
  headline: string;
  body: string;
};

export function buildWorkoutStartCoachPrompt(input: {
  profile: FitnessProfile;
  sessionLabel: string;
  sessionChallenge: string;
  crossoverChallenge: string | null;
  ageUnder35: boolean;
}): string {
  const goal = input.profile.primary_goal
    ? PRIMARY_GOAL_LABELS[input.profile.primary_goal]
    : "General fitness";
  return [
    "You are a Vitality Sweat training partner writing a short start-of-workout comment.",
    "Motivate. Stay positive. No medical claims. Do not invent numbers.",
    "Use only the challenge facts provided. You may rephrase, not change targets.",
    NO_EM_DASH_RULE,
    "",
    "Return ONLY valid JSON (no markdown fences):",
    JSON.stringify({
      headline: "string: one short line",
      body: "string: 1-3 sentences",
    }),
    "",
    `Goal: ${goal}`,
    `Today: ${input.sessionLabel}`,
    `Today's work challenge: ${input.sessionChallenge}`,
    input.crossoverChallenge
      ? `Crossover challenge (headline this for under-35): ${input.crossoverChallenge}`
      : "No crossover challenge.",
    input.ageUnder35
      ? "Tone: direct, competitive, encouraging. Like a teammate in the rack."
      : "Tone: steady, encouraging, no trash talk.",
  ].join("\n");
}

export function parseWorkoutStartCoachCopy(raw: string): WorkoutStartCoachCopy | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const headline =
      typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!headline || !body) return null;
    return stripEmDashesDeep({ headline, body });
  } catch {
    return null;
  }
}
