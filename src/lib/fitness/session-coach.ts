import type { SupabaseClient } from "@supabase/supabase-js";
import { suggestProgression } from "@/lib/fitness/progression";
import {
  CROSSOVER_ENDURANCE_SLUGS,
  CROSSOVER_STRENGTH_NAMES,
} from "@/lib/fitness/leaderboard";
import {
  goldForExercise,
  recentMedalsForUser,
} from "@/lib/fitness/leaderboard-query";
import { ageFromBirthdate } from "@/lib/fitness/profile";
import type { FitnessProfile, PrimaryGoal } from "@/lib/fitness/types";

export type SessionChallenge = {
  kind: "progression" | "cardio" | "hold";
  exerciseName: string;
  message: string;
};

export type CrossoverChallenge = {
  fromExerciseName: string;
  targetExerciseName: string;
  targetExerciseId: string | null;
  message: string;
  goldDetail: string | null;
};

export type CoachBrief = {
  headline: string;
  body: string;
  sessionChallenge: SessionChallenge | null;
  crossover: CrossoverChallenge | null;
  generatedAt: string;
};

type PlannedMove = {
  exerciseId: string;
  name: string;
  category: string | null;
  trackingType: string | null;
};

export async function buildSessionChallenges(input: {
  supabase: SupabaseClient;
  admin: SupabaseClient | null;
  userId: string;
  profile: FitnessProfile;
  planned: PlannedMove[];
}): Promise<{
  sessionChallenge: SessionChallenge | null;
  crossover: CrossoverChallenge | null;
}> {
  const sessionChallenge = await firstProgressionChallenge(
    input.supabase,
    input.userId,
    input.planned,
    input.profile.primary_goal,
  );

  const age = input.profile.birthdate
    ? ageFromBirthdate(input.profile.birthdate)
    : null;
  const under35 = age != null && age < 35;
  const leaderboardOn = input.profile.leaderboard_opt_in !== false;
  let crossover: CrossoverChallenge | null = null;
  if (under35 && leaderboardOn && input.admin) {
    crossover = await buildCrossoverChallenge({
      admin: input.admin,
      supabase: input.supabase,
      userId: input.userId,
      planned: input.planned,
    });
  }

  return { sessionChallenge, crossover };
}

async function firstProgressionChallenge(
  supabase: SupabaseClient,
  userId: string,
  planned: PlannedMove[],
  goal: PrimaryGoal | null,
): Promise<SessionChallenge | null> {
  for (const move of planned) {
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id, started_at")
      .eq("user_id", userId)
      .in("status", ["completed", "active"])
      .order("started_at", { ascending: false })
      .limit(12);
    if (!sessions?.length) continue;
    const { data: sets } = await supabase
      .from("workout_sets")
      .select(
        "session_id, weight_lb, reps, difficulty, distance_m, duration_sec, incline_pct, created_at",
      )
      .eq("exercise_id", move.exerciseId)
      .in(
        "session_id",
        sessions.map((s) => s.id),
      )
      .order("created_at", { ascending: false })
      .limit(20);
    if (!sets?.length) continue;

    const lastSessionId = sets[0]!.session_id as string;
    const lastSets = sets.filter((s) => s.session_id === lastSessionId);
    const lastSession = sessions.find((s) => s.id === lastSessionId);
    const tracking = move.trackingType ?? "weight_reps";

    if (tracking === "distance" || tracking === "duration") {
      const lastDistance = lastSets
        .map((s) => (s.distance_m != null ? Number(s.distance_m) : null))
        .filter((n): n is number => n != null);
      const lastIncline = lastSets
        .map((s) => (s.incline_pct != null ? Number(s.incline_pct) : null))
        .filter((n): n is number => n != null);
      const distance = lastDistance.length ? Math.max(...lastDistance) : null;
      const incline = lastIncline.length ? Math.max(...lastIncline) : 0;
      if (distance != null && (goal === "weight_loss" || tracking === "distance")) {
        const nextIncline = Math.min(15, incline + 1);
        return {
          kind: "cardio",
          exerciseName: move.name,
          message:
            nextIncline > incline
              ? `Last ${move.name}: ${Math.round(distance)} m at ${incline}% incline. Hit the same distance at ${nextIncline}%.`
              : `Last ${move.name}: ${Math.round(distance)} m. Add a little distance or keep the same mark clean.`,
        };
      }
      if (tracking === "duration") {
        const lastDur = lastSets
          .map((s) => (s.duration_sec != null ? Number(s.duration_sec) : 0))
          .reduce((a, b) => Math.max(a, b), 0);
        if (lastDur > 0) {
          return {
            kind: "cardio",
            exerciseName: move.name,
            message: `Last ${move.name}: ${lastDur} sec. Hold that time or add a small bump.`,
          };
        }
      }
      continue;
    }

    const suggestion = suggestProgression(
      move.exerciseId,
      lastSets.map((s) => ({
        weight_lb: s.weight_lb != null ? Number(s.weight_lb) : null,
        reps: s.reps != null ? Number(s.reps) : null,
        difficulty: Number(s.difficulty) || 3,
        set_number: 1,
      })),
      { lastSessionAt: lastSession?.started_at ?? null },
    );
    if (!suggestion) continue;
    return {
      kind: suggestion.heldForMissedWeek ? "hold" : "progression",
      exerciseName: move.name,
      message: suggestion.message,
    };
  }
  return planned[0]
    ? {
        kind: "hold",
        exerciseName: planned[0].name,
        message: `First logged look at ${planned[0].name}. Set a clean baseline and leave a rep in the tank.`,
      }
    : null;
}

async function buildCrossoverChallenge(input: {
  admin: SupabaseClient;
  supabase: SupabaseClient;
  userId: string;
  planned: PlannedMove[];
}): Promise<CrossoverChallenge | null> {
  const medals = await recentMedalsForUser(input.admin, input.userId, 7);
  const strengthMedal = medals.find((m) => m.klass === "strength");
  const enduranceMedal = medals.find((m) => m.klass === "endurance");

  if (strengthMedal) {
    const targets = await input.supabase
      .from("exercises")
      .select("id, name, slug")
      .in("slug", [...CROSSOVER_ENDURANCE_SLUGS])
      .eq("is_active", true);
    const ordered = [...CROSSOVER_ENDURANCE_SLUGS]
      .map((slug) => (targets.data ?? []).find((row) => row.slug === slug))
      .filter(Boolean);
    const target = ordered[0];
    if (!target) return null;
    const gold = await goldForExercise(
      input.admin,
      target.id as string,
      "endurance",
      input.userId,
    );
    return {
      fromExerciseName: strengthMedal.exerciseName,
      targetExerciseName: String(target.name),
      targetExerciseId: String(target.id),
      goldDetail: gold?.detail ?? null,
      message: gold
        ? `You are on the ${strengthMedal.exerciseName} board. Can your engine match it? Gold on ${target.name} is ${gold.detail}. Hit that mark.`
        : `You are on the ${strengthMedal.exerciseName} board. Nobody owns ${target.name} yet. Set the bar.`,
    };
  }

  if (enduranceMedal) {
    const { data: logged } = await input.supabase
      .from("workout_sets")
      .select("exercise_id")
      .limit(80);
    const loggedIds = [...new Set((logged ?? []).map((r) => r.exercise_id as string))];
    const { data: compounds } = await input.supabase
      .from("exercises")
      .select("id, name")
      .in("name", CROSSOVER_STRENGTH_NAMES)
      .eq("is_active", true);
    const compoundRow =
      (compounds ?? []).find((row) => loggedIds.includes(row.id as string)) ??
      (compounds ?? [])[0] ??
      null;
    const plannedStrength = input.planned.find((p) => p.category === "strength");
    const targetId = compoundRow ? String(compoundRow.id) : plannedStrength?.exerciseId;
    const targetName = compoundRow
      ? String(compoundRow.name)
      : plannedStrength?.name;
    if (!targetId || !targetName) return null;
    const gold = await goldForExercise(
      input.admin,
      targetId,
      "strength",
      input.userId,
    );
    return {
      fromExerciseName: enduranceMedal.exerciseName,
      targetExerciseName: targetName,
      targetExerciseId: targetId,
      goldDetail: gold?.detail ?? null,
      message: gold
        ? `You showed up on ${enduranceMedal.exerciseName}. Gold on ${targetName} is ${gold.detail}. See if the iron matches.`
        : `You showed up on ${enduranceMedal.exerciseName}. Nobody owns ${targetName} yet. Set the bar.`,
    };
  }

  return null;
}

export function fallbackCoachCopy(input: {
  sessionChallenge: SessionChallenge | null;
  crossover: CrossoverChallenge | null;
}): { headline: string; body: string } {
  if (input.crossover) {
    return {
      headline: "Cross the line",
      body: input.crossover.message,
    };
  }
  if (input.sessionChallenge) {
    return {
      headline: `Today: ${input.sessionChallenge.exerciseName}`,
      body: input.sessionChallenge.message,
    };
  }
  return {
    headline: "Time to train",
    body: "Show up, log the work, and leave a little in the tank.",
  };
}
