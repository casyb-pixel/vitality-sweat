import type { SupabaseClient } from "@supabase/supabase-js";
import { latestBodyWeightLb } from "@/lib/fitness/body-logs";
import { chicagoDateString } from "@/lib/engine-room/calendar";
import {
  rankSessionExercises,
  type PersonalLiftRank,
  type RankableExercise,
  type RankableSet,
} from "@/lib/engine-room/ranks";
import { sessionPostBody } from "@/lib/engine-room/snapshot";
import { nextStreakState } from "@/lib/engine-room/streak";
import { stripEmDashes } from "@/lib/text/humanize-copy";

export type BankedSession = {
  postId: string;
  ranks: PersonalLiftRank[];
  streakCount: number;
  bodyWeightLb: number | null;
  alreadyPosted: boolean;
};

type SetRow = {
  exercise_id: string;
  weight_lb: number | null;
  reps: number | null;
  set_kind: string | null;
  exercise?: {
    id?: string;
    name?: string | null;
    tracking_type?: string | null;
    category?: string | null;
    equipment?: string | null;
  } | null;
};

export async function bankSessionToEngineRoom(input: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  visibility: "followers" | "public";
}): Promise<{ ok: true; data: BankedSession } | { ok: false; error: string }> {
  const { data: existing } = await input.supabase
    .from("engine_room_posts")
    .select("id, milestone_payload")
    .eq("author_id", input.userId)
    .eq("kind", "session")
    .eq("session_id", input.sessionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) {
    const payload = existing.milestone_payload as {
      ranks?: PersonalLiftRank[];
      streakCount?: number;
      bodyWeightLb?: number | null;
    } | null;
    return {
      ok: true,
      data: {
        postId: existing.id as string,
        ranks: payload?.ranks ?? [],
        streakCount: payload?.streakCount ?? 0,
        bodyWeightLb: payload?.bodyWeightLb ?? null,
        alreadyPosted: true,
      },
    };
  }

  const { data: session } = await input.supabase
    .from("workout_sessions")
    .select("id, status, body_weight_lb")
    .eq("id", input.sessionId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!session) {
    return { ok: false, error: "Session not found." };
  }
  if (session.status !== "completed") {
    return { ok: false, error: "Finish the workout before locking ranks." };
  }

  const { data: setRows, error: setError } = await input.supabase
    .from("workout_sets")
    .select(
      "exercise_id, weight_lb, reps, set_kind, exercise:exercises ( id, name, tracking_type, category, equipment )",
    )
    .eq("session_id", input.sessionId);
  if (setError) {
    return { ok: false, error: setError.message };
  }
  const sets = (setRows ?? []) as SetRow[];
  if (sets.length === 0) {
    return { ok: false, error: "Log at least one set before posting this session." };
  }

  const sessionBw =
    session.body_weight_lb != null ? Number(session.body_weight_lb) : null;
  const logBw = await latestBodyWeightLb(input.supabase, input.userId);
  const bodyWeightLb =
    sessionBw != null && Number.isFinite(sessionBw) && sessionBw > 0
      ? sessionBw
      : logBw;

  const byExercise = new Map<
    string,
    { exercise: RankableExercise; sets: RankableSet[] }
  >();
  for (const row of sets) {
    const ex = row.exercise;
    const id = String(ex?.id ?? row.exercise_id);
    const current = byExercise.get(id) ?? {
      exercise: {
        id,
        name: ex?.name ?? "Lift",
        trackingType: ex?.tracking_type ?? null,
        category: ex?.category ?? null,
        equipment: ex?.equipment ?? null,
      },
      sets: [],
    };
    current.sets.push({
      weightLb: row.weight_lb != null ? Number(row.weight_lb) : null,
      reps: row.reps != null ? Number(row.reps) : null,
      setKind: row.set_kind,
    });
    byExercise.set(id, current);
  }

  const ranks = rankSessionExercises({
    exercises: [...byExercise.values()],
    bodyWeightLb,
  });

  const { data: streakRow } = await input.supabase
    .from("engine_room_streaks")
    .select("current_count, last_posted_on")
    .eq("user_id", input.userId)
    .maybeSingle();
  const postedOn = chicagoDateString();
  const streak = nextStreakState({
    currentCount: Number(streakRow?.current_count ?? 0),
    lastPostedOn:
      typeof streakRow?.last_posted_on === "string"
        ? streakRow.last_posted_on
        : null,
    postedOn,
  });

  const body = stripEmDashes(sessionPostBody(ranks));
  const { data: post, error: postError } = await input.supabase
    .from("engine_room_posts")
    .insert({
      author_id: input.userId,
      kind: "session",
      body,
      session_id: input.sessionId,
      visibility: input.visibility,
      milestone_payload: {
        title: "Session ranks",
        type: "session",
        session_id: input.sessionId,
        bodyWeightLb,
        streakCount: streak.currentCount,
        ranks,
      },
    })
    .select("id")
    .single();
  if (postError || !post) {
    return { ok: false, error: postError?.message ?? "Could not post session." };
  }

  if (ranks.length > 0) {
    const { error: rankError } = await input.supabase
      .from("engine_room_session_ranks")
      .insert(
        ranks.map((rank) => ({
          user_id: input.userId,
          session_id: input.sessionId,
          exercise_id: rank.exerciseId,
          score: rank.score,
          band: rank.band,
          detail: rank.detail,
          kind: rank.kind,
        })),
      );
    if (rankError) {
      console.error("[engine-room] ranks insert", rankError.message);
    }
  }

  const { error: streakError } = await input.supabase
    .from("engine_room_streaks")
    .upsert({
      user_id: input.userId,
      current_count: streak.currentCount,
      last_posted_on: streak.lastPostedOn,
      updated_at: new Date().toISOString(),
    });
  if (streakError) {
    console.error("[engine-room] streak upsert", streakError.message);
  }

  return {
    ok: true,
    data: {
      postId: post.id as string,
      ranks,
      streakCount: streak.currentCount,
      bodyWeightLb,
      alreadyPosted: false,
    },
  };
}
