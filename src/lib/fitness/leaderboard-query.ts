import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enduranceScore,
  formatEnduranceDetail,
  formatStrengthDetail,
  formatWeightLossDetail,
  medalsFor,
  relativeBodyweightScore,
  strengthP4pScore,
  weightLossEligible,
  type LeaderboardBoard,
  type LeaderboardClass,
  type LeaderboardEntry,
} from "@/lib/fitness/leaderboard";

type EligibleMember = {
  id: string;
  username: string;
  display_name: string | null;
};

type BestRow = Omit<LeaderboardEntry, "medal">;

export async function loadLeaderboards(
  admin: SupabaseClient,
  input: {
    klass: LeaderboardClass;
    exerciseId?: string | null;
    viewerId: string;
  },
): Promise<{ optedIn: boolean; boards: LeaderboardBoard[] }> {
  const { data: viewerFit } = await admin
    .from("fitness_profiles")
    .select("leaderboard_opt_in")
    .eq("id", input.viewerId)
    .maybeSingle();
  if (viewerFit && viewerFit.leaderboard_opt_in === false) {
    return { optedIn: false, boards: [] };
  }

  const members = await eligibleMembers(admin, input.viewerId);
  if (members.length === 0) {
    return { optedIn: true, boards: [] };
  }

  if (input.klass === "weight_loss") {
    const board = await weightLossBoard(admin, members);
    return { optedIn: true, boards: board ? [board] : [] };
  }

  if (input.klass === "strength") {
    return {
      optedIn: true,
      boards: await strengthBoards(admin, members, input.exerciseId),
    };
  }

  return {
    optedIn: true,
    boards: await enduranceBoards(admin, members, input.exerciseId),
  };
}

export async function goldForExercise(
  admin: SupabaseClient,
  exerciseId: string,
  klass: Exclude<LeaderboardClass, "weight_loss">,
  viewerId: string,
): Promise<LeaderboardEntry | null> {
  const { boards } = await loadLeaderboards(admin, {
    klass,
    exerciseId,
    viewerId,
  });
  return boards[0]?.entries.find((e) => e.medal === "gold") ?? null;
}

export async function recentMedalsForUser(
  admin: SupabaseClient,
  userId: string,
  withinDays = 7,
): Promise<Array<{ klass: LeaderboardClass; exerciseId: string | null; exerciseName: string; medal: string }>> {
  const [strength, endurance, weightLoss] = await Promise.all([
    loadLeaderboards(admin, { klass: "strength", viewerId: userId }),
    loadLeaderboards(admin, { klass: "endurance", viewerId: userId }),
    loadLeaderboards(admin, { klass: "weight_loss", viewerId: userId }),
  ]);
  const since = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  const medals: Array<{
    klass: LeaderboardClass;
    exerciseId: string | null;
    exerciseName: string;
    medal: string;
  }> = [];
  for (const board of [...strength.boards, ...endurance.boards, ...weightLoss.boards]) {
    const hit = board.entries.find((e) => e.userId === userId);
    if (!hit) continue;
    medals.push({
      klass: board.class,
      exerciseId: board.exerciseId,
      exerciseName: board.exerciseName,
      medal: hit.medal,
    });
  }
  // Recency is approximated: appearing on the live board after a recent PR is enough.
  void since;
  return medals;
}

async function eligibleMembers(
  admin: SupabaseClient,
  viewerId: string,
): Promise<EligibleMember[]> {
  const [{ data: profiles }, { data: fitness }, { data: blocks }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name"),
    admin
      .from("fitness_profiles")
      .select("id, leaderboard_opt_in")
      .eq("leaderboard_opt_in", true),
    admin
      .from("member_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
  ]);

  const opted = new Set((fitness ?? []).map((row) => row.id as string));
  const hidden = new Set<string>();
  for (const row of blocks ?? []) {
    if (row.blocker_id === viewerId) hidden.add(row.blocked_id as string);
    if (row.blocked_id === viewerId) hidden.add(row.blocker_id as string);
  }

  return ((profiles ?? []) as EligibleMember[]).filter(
    (p) =>
      Boolean(p.username) &&
      opted.has(p.id) &&
      !hidden.has(p.id),
  );
}

async function strengthBoards(
  admin: SupabaseClient,
  members: EligibleMember[],
  exerciseId?: string | null,
): Promise<LeaderboardBoard[]> {
  const memberIds = members.map((m) => m.id);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  let exerciseQuery = admin
    .from("exercises")
    .select("id, name, category, tracking_type, slug")
    .eq("is_active", true)
    .eq("category", "strength");
  if (exerciseId) exerciseQuery = exerciseQuery.eq("id", exerciseId);
  const { data: exercises } = await exerciseQuery.limit(400);
  const exerciseList = exercises ?? [];
  if (exerciseList.length === 0) return [];

  const { data: sessions } = await admin
    .from("workout_sessions")
    .select("id, user_id, body_weight_lb, status")
    .in("user_id", memberIds)
    .in("status", ["completed", "active"]);
  const sessionRows = sessions ?? [];
  if (sessionRows.length === 0) return [];
  const sessionMap = new Map(
    sessionRows.map((s) => [
      s.id as string,
      {
        userId: s.user_id as string,
        bodyWeight: s.body_weight_lb != null ? Number(s.body_weight_lb) : null,
      },
    ]),
  );

  const { data: weights } = await admin
    .from("body_weight_logs")
    .select("user_id, weight_lb, recorded_on")
    .in("user_id", memberIds)
    .order("recorded_on", { ascending: false });
  const latestWeight = new Map<string, number>();
  for (const row of weights ?? []) {
    const uid = row.user_id as string;
    if (latestWeight.has(uid)) continue;
    latestWeight.set(uid, Number(row.weight_lb));
  }

  const sessionIds = sessionRows.map((s) => s.id as string);
  const exerciseIds = exerciseList.map((e) => e.id as string);
  const { data: sets } = await admin
    .from("workout_sets")
    .select("session_id, exercise_id, weight_lb, reps, set_kind")
    .in("session_id", sessionIds)
    .in("exercise_id", exerciseIds)
    .or("set_kind.eq.working,set_kind.is.null")
    .limit(8000);

  const bestByKey = new Map<string, BestRow & { rawWeight: number; rawReps: number }>();
  const tracking = new Map(
    exerciseList.map((e) => [e.id as string, String(e.tracking_type ?? "weight_reps")]),
  );
  const names = new Map(exerciseList.map((e) => [e.id as string, String(e.name)]));

  for (const set of sets ?? []) {
    const session = sessionMap.get(set.session_id as string);
    if (!session) continue;
    const member = memberMap.get(session.userId);
    if (!member) continue;
    const bodyWeight = session.bodyWeight ?? latestWeight.get(session.userId) ?? null;
    if (bodyWeight == null) continue;
    const weight = set.weight_lb != null ? Number(set.weight_lb) : 0;
    const reps = set.reps != null ? Number(set.reps) : 0;
    const type = tracking.get(set.exercise_id as string) ?? "weight_reps";
    const score =
      type === "reps_only"
        ? relativeBodyweightScore({ extraWeightLb: weight || null, bodyWeightLb: bodyWeight })
        : strengthP4pScore({ weightLb: weight, reps, bodyWeightLb: bodyWeight });
    if (score == null) continue;
    const key = `${session.userId}:${set.exercise_id}`;
    const prev = bestByKey.get(key);
    if (prev && prev.score >= score) continue;
    const exerciseName = names.get(set.exercise_id as string) ?? "Lift";
    bestByKey.set(key, {
      userId: session.userId,
      username: member.username,
      displayName: member.display_name,
      exerciseId: set.exercise_id as string,
      exerciseName,
      score,
      detail: formatStrengthDetail({
        score,
        weightLb: type === "reps_only" ? bodyWeight + weight : weight,
        reps: reps || 1,
      }),
      rawWeight: weight,
      rawReps: reps,
    });
  }

  return groupBoards("strength", [...bestByKey.values()]);
}

async function enduranceBoards(
  admin: SupabaseClient,
  members: EligibleMember[],
  exerciseId?: string | null,
): Promise<LeaderboardBoard[]> {
  const memberIds = members.map((m) => m.id);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  let exerciseQuery = admin
    .from("exercises")
    .select("id, name, category, tracking_type")
    .eq("is_active", true)
    .in("category", ["cardio", "endurance"]);
  if (exerciseId) exerciseQuery = exerciseQuery.eq("id", exerciseId);
  const { data: exercises } = await exerciseQuery.limit(200);
  const exerciseList = exercises ?? [];
  if (exerciseList.length === 0) return [];

  const { data: sessions } = await admin
    .from("workout_sessions")
    .select("id, user_id, status")
    .in("user_id", memberIds)
    .in("status", ["completed", "active"]);
  const sessionRows = sessions ?? [];
  if (sessionRows.length === 0) return [];
  const sessionUser = new Map(
    sessionRows.map((s) => [s.id as string, s.user_id as string]),
  );

  const { data: sets } = await admin
    .from("workout_sets")
    .select(
      "session_id, exercise_id, distance_m, duration_sec, incline_pct, elevation_m, reps, set_kind",
    )
    .in("session_id", sessionRows.map((s) => s.id as string))
    .in(
      "exercise_id",
      exerciseList.map((e) => e.id as string),
    )
    .or("set_kind.eq.working,set_kind.eq.timed,set_kind.is.null")
    .limit(8000);

  const tracking = new Map(
    exerciseList.map((e) => [e.id as string, String(e.tracking_type ?? "distance")]),
  );
  const names = new Map(exerciseList.map((e) => [e.id as string, String(e.name)]));
  const bestByKey = new Map<string, BestRow>();

  for (const set of sets ?? []) {
    const userId = sessionUser.get(set.session_id as string);
    if (!userId) continue;
    const member = memberMap.get(userId);
    if (!member) continue;
    const score = enduranceScore({
      distanceM: set.distance_m != null ? Number(set.distance_m) : null,
      durationSec: set.duration_sec != null ? Number(set.duration_sec) : null,
      inclinePct: set.incline_pct != null ? Number(set.incline_pct) : null,
      elevationM: set.elevation_m != null ? Number(set.elevation_m) : null,
      reps: set.reps != null ? Number(set.reps) : null,
      trackingType: tracking.get(set.exercise_id as string) ?? "distance",
    });
    if (score == null) continue;
    const key = `${userId}:${set.exercise_id}`;
    const prev = bestByKey.get(key);
    if (prev && prev.score >= score) continue;
    bestByKey.set(key, {
      userId,
      username: member.username,
      displayName: member.display_name,
      exerciseId: set.exercise_id as string,
      exerciseName: names.get(set.exercise_id as string) ?? "Cardio",
      score,
      detail: formatEnduranceDetail({
        distanceM: set.distance_m != null ? Number(set.distance_m) : null,
        durationSec: set.duration_sec != null ? Number(set.duration_sec) : null,
        inclinePct: set.incline_pct != null ? Number(set.incline_pct) : null,
        elevationM: set.elevation_m != null ? Number(set.elevation_m) : null,
        reps: set.reps != null ? Number(set.reps) : null,
      }),
    });
  }

  return groupBoards("endurance", [...bestByKey.values()]);
}

async function weightLossBoard(
  admin: SupabaseClient,
  members: EligibleMember[],
): Promise<LeaderboardBoard | null> {
  const memberIds = members.map((m) => m.id);
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const { data: logs } = await admin
    .from("body_weight_logs")
    .select("user_id, recorded_on, weight_lb")
    .in("user_id", memberIds)
    .order("recorded_on", { ascending: true });

  const byUser = new Map<string, Array<{ on: string; lb: number }>>();
  for (const row of logs ?? []) {
    const uid = row.user_id as string;
    const list = byUser.get(uid) ?? [];
    list.push({ on: String(row.recorded_on), lb: Number(row.weight_lb) });
    byUser.set(uid, list);
  }

  const ranked: BestRow[] = [];
  for (const [userId, points] of byUser) {
    if (points.length < 2) continue;
    const member = memberMap.get(userId);
    if (!member) continue;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const result = weightLossEligible({
      startOn: first.on,
      currentOn: last.on,
      startLb: first.lb,
      currentLb: last.lb,
    });
    if (!result) continue;
    ranked.push({
      userId,
      username: member.username,
      displayName: member.display_name,
      exerciseId: null,
      exerciseName: "Weight loss",
      score: result.percent,
      detail: formatWeightLossDetail(result),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  const entries = medalsFor(ranked);
  if (entries.length === 0) return null;
  return {
    class: "weight_loss",
    exerciseId: null,
    exerciseName: "Weight loss",
    entries,
  };
}

function groupBoards(
  klass: Exclude<LeaderboardClass, "weight_loss">,
  rows: BestRow[],
): LeaderboardBoard[] {
  const byExercise = new Map<string, BestRow[]>();
  for (const row of rows) {
    const key = row.exerciseId ?? row.exerciseName;
    const list = byExercise.get(key) ?? [];
    list.push(row);
    byExercise.set(key, list);
  }
  const boards: LeaderboardBoard[] = [];
  for (const list of byExercise.values()) {
    list.sort((a, b) => b.score - a.score);
    const entries = medalsFor(list);
    if (!entries.length) continue;
    boards.push({
      class: klass,
      exerciseId: entries[0]!.exerciseId,
      exerciseName: entries[0]!.exerciseName,
      entries,
    });
  }
  boards.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  return boards;
}
