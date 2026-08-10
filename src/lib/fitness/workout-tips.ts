import type { PrimaryGoal } from "@/lib/fitness/types";

export type WorkoutTipKind = "coaching" | "fuel" | "chronicle";

export type WorkoutTip = {
  id: string;
  kind: WorkoutTipKind;
  title: string;
  body: string;
  href?: string;
  /** Empty / omit = any goal. */
  goals?: PrimaryGoal[];
  /** Empty / omit = any muscle. Lowercase labels. */
  muscles?: string[];
};

/** Curated in-session chips. Coaching only; no dosages or disease claims. */
export const CURATED_WORKOUT_TIPS: readonly WorkoutTip[] = [
  {
    id: "coach-breath-brace",
    kind: "coaching",
    title: "Brace, then move",
    body: "Take a quiet breath in, brace your midsection, then drive the rep with control.",
  },
  {
    id: "coach-last-rep-quality",
    kind: "coaching",
    title: "Keep the last rep clean",
    body: "Stop one clean rep before form breaks. Quality beats grinding junk reps.",
  },
  {
    id: "coach-strength-rest",
    kind: "coaching",
    title: "Own the rest",
    body: "For heavier sets, stay still and breathe. Rushing rest steals the next set.",
    goals: ["strength"],
  },
  {
    id: "coach-strength-setup",
    kind: "coaching",
    title: "Set up once",
    body: "Feet, grip, and eye line first. A solid setup makes heavy work feel calmer.",
    goals: ["strength"],
  },
  {
    id: "coach-hypertrophy-tempo",
    kind: "coaching",
    title: "Slow the lower",
    body: "Lower with intent for about 2 seconds. Feel the muscle, then drive up.",
    goals: ["muscle_gain"],
  },
  {
    id: "coach-hypertrophy-squeeze",
    kind: "coaching",
    title: "Pause at the peak",
    body: "A brief squeeze at the top helps you own the range without swinging.",
    goals: ["muscle_gain"],
  },
  {
    id: "coach-fatloss-pace",
    kind: "coaching",
    title: "Keep transitions tight",
    body: "Log the set, start the rest, then reset your stance early so the next set starts on time.",
    goals: ["weight_loss"],
  },
  {
    id: "coach-endurance-smooth",
    kind: "coaching",
    title: "Smooth and steady",
    body: "Even breathing and consistent tempo beat sprinting early and fading late.",
    goals: ["endurance", "marathon_training"],
  },
  {
    id: "coach-sports-intent",
    kind: "coaching",
    title: "Train with intent",
    body: "Move like the sport matters: crisp starts, clean finishes, no wasted motion.",
    goals: ["sports_training"],
  },
  {
    id: "coach-legs-foot-pressure",
    kind: "coaching",
    title: "Push the floor away",
    body: "Spread pressure through mid-foot. Think drive the floor down, not bounce up.",
    muscles: ["legs", "glutes", "quads", "hamstrings"],
  },
  {
    id: "coach-back-pack",
    kind: "coaching",
    title: "Pack the shoulders",
    body: "Pull shoulder blades gently into your back pockets before the pull starts.",
    muscles: ["back", "lats"],
  },
  {
    id: "coach-chest-path",
    kind: "coaching",
    title: "Elbow path matters",
    body: "Keep elbows under the load and stop shy of a shrug at the top.",
    muscles: ["chest"],
  },
  {
    id: "coach-shoulders-soft-ribs",
    kind: "coaching",
    title: "Ribs quiet",
    body: "Keep ribs down and neck long so the shoulders do the work, not your low back.",
    muscles: ["shoulders"],
  },
  {
    id: "coach-arms-control",
    kind: "coaching",
    title: "Full control",
    body: "No swinging. Lock the upper arm and let the elbow do the work.",
    muscles: ["arms", "biceps", "triceps"],
  },
  {
    id: "coach-core-exhale",
    kind: "coaching",
    title: "Exhale on effort",
    body: "Breathe out as you brace hardest. Soft belly breathing between reps is fine.",
    muscles: ["core"],
  },
  {
    id: "fuel-water-sip",
    kind: "fuel",
    title: "Sip, don’t chug",
    body: "A few sips of water between sets usually beats gulping a full bottle mid-set.",
  },
  {
    id: "fuel-electrolytes",
    kind: "fuel",
    title: "Sweaty session tip",
    body: "If you are sweating a lot, plain water plus a light electrolyte drink can feel better than water alone.",
  },
  {
    id: "fuel-protein-window",
    kind: "fuel",
    title: "Protein later helps",
    body: "A protein-forward meal or shake after training supports recovery. Timing is flexible.",
    goals: ["muscle_gain", "strength", "general_fitness"],
  },
  {
    id: "fuel-carb-support",
    kind: "fuel",
    title: "Carbs as fuel",
    body: "If energy dips mid-session, a simple carb snack beforehand next time often helps.",
    goals: ["endurance", "marathon_training", "weight_loss", "sports_training"],
  },
  {
    id: "fuel-creatine-note",
    kind: "fuel",
    title: "Creatine is optional",
    body: "Many lifters use creatine daily as a training aid. It is optional coaching, not medical advice.",
    goals: ["strength", "muscle_gain"],
  },
  {
    id: "fuel-vitamin-d-note",
    kind: "fuel",
    title: "Basics over stacks",
    body: "Sleep, food, and consistency beat fancy stacks. A basic vitamin routine is optional support only.",
  },
  {
    id: "fuel-caffeine-note",
    kind: "fuel",
    title: "Caffeine, carefully",
    body: "A little caffeine before training can sharpen focus for some people. Skip it if it spikes nerves or sleep.",
  },
] as const;

function normalizeMuscle(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function tipMatchesContext(
  tip: WorkoutTip,
  goal: PrimaryGoal | null | undefined,
  muscle: string | null | undefined,
): boolean {
  if (tip.goals && tip.goals.length > 0) {
    if (!goal || !tip.goals.includes(goal)) return false;
  }
  if (tip.muscles && tip.muscles.length > 0) {
    const m = normalizeMuscle(muscle);
    if (!m) return false;
    if (!tip.muscles.some((tag) => m.includes(tag) || tag.includes(m))) {
      return false;
    }
  }
  return true;
}

export function pickCuratedWorkoutTip(input: {
  goal?: PrimaryGoal | null;
  muscle?: string | null;
  excludeIds?: readonly string[];
  preferKind?: WorkoutTipKind | null;
  salt?: string;
}): WorkoutTip | null {
  const exclude = new Set(input.excludeIds ?? []);
  let pool = CURATED_WORKOUT_TIPS.filter(
    (tip) =>
      !exclude.has(tip.id) &&
      tipMatchesContext(tip, input.goal, input.muscle),
  );

  if (pool.length === 0) {
    pool = CURATED_WORKOUT_TIPS.filter(
      (tip) =>
        !exclude.has(tip.id) &&
        (!tip.muscles || tip.muscles.length === 0) &&
        tipMatchesContext(tip, input.goal, null),
    );
  }

  if (pool.length === 0) {
    pool = CURATED_WORKOUT_TIPS.filter((tip) => !exclude.has(tip.id));
  }

  if (pool.length === 0) return null;

  if (input.preferKind) {
    const preferred = pool.filter((t) => t.kind === input.preferKind);
    if (preferred.length > 0) pool = preferred;
  }

  const salt = input.salt ?? `${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length] ?? null;
}

export function blogSearchTerms(input: {
  goal?: PrimaryGoal | null;
  muscle?: string | null;
  exerciseName?: string | null;
}): string[] {
  const terms: string[] = [];
  const muscle = normalizeMuscle(input.muscle);
  if (muscle) terms.push(muscle);
  if (input.exerciseName?.trim()) terms.push(input.exerciseName.trim());
  switch (input.goal) {
    case "strength":
      terms.push("strength", "lifting");
      break;
    case "muscle_gain":
      terms.push("muscle", "hypertrophy", "protein");
      break;
    case "weight_loss":
      terms.push("fat loss", "energy", "nutrition");
      break;
    case "endurance":
    case "marathon_training":
      terms.push("endurance", "cardio", "running");
      break;
    case "sports_training":
      terms.push("performance", "training");
      break;
    default:
      terms.push("recovery", "training");
  }
  return [...new Set(terms.map((t) => t.toLowerCase()))].slice(0, 6);
}
