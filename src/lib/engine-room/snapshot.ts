import type { SupabaseClient } from "@supabase/supabase-js";
import { chicagoDateString, chicagoWeekStart } from "@/lib/engine-room/calendar";
import { weeklyQuests, type WeeklyQuest } from "@/lib/engine-room/quests";
import {
  RANK_BAND_LABEL,
  type PersonalLiftRank,
  type RankBand,
} from "@/lib/engine-room/ranks";

export type EngineRoomStreak = {
  currentCount: number;
  lastPostedOn: string | null;
};

export type RankHighlight = {
  exerciseName: string;
  band: RankBand | null;
  detail: string;
};

export type EngineRoomGameSnapshot = {
  streak: EngineRoomStreak;
  quests: WeeklyQuest[];
  rankHighlights: RankHighlight[];
  weekStart: string;
};

type RankRow = {
  exercise_id: string;
  score: number;
  band: RankBand | null;
  detail: string;
  session_id: string;
  created_at: string;
  exercise?: { name?: string | null } | null;
};

export function formatRankLine(rank: {
  exerciseName: string;
  band: RankBand | null;
  detail: string;
}): string {
  const band = rank.band ? RANK_BAND_LABEL[rank.band] : "Unranked";
  return `${rank.exerciseName}: ${band} · ${rank.detail}`;
}

export async function loadGameSnapshot(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<EngineRoomGameSnapshot> {
  const today = chicagoDateString(now);
  const weekStart = chicagoWeekStart(today) ?? today;

  const [{ data: streakRow }, { data: posts }, { data: ranks }] =
    await Promise.all([
      supabase
        .from("engine_room_streaks")
        .select("current_count, last_posted_on")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("engine_room_posts")
        .select("id, created_at, session_id")
        .eq("author_id", userId)
        .eq("kind", "session")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("engine_room_session_ranks")
        .select(
          "exercise_id, score, band, detail, session_id, created_at, exercise:exercises ( name )",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

  const streak: EngineRoomStreak = {
    currentCount: Number(streakRow?.current_count ?? 0),
    lastPostedOn:
      typeof streakRow?.last_posted_on === "string"
        ? streakRow.last_posted_on
        : null,
  };

  const weekPosts = (posts ?? []).filter((post) => {
    const created = chicagoDateString(new Date(post.created_at as string));
    return created >= weekStart;
  }).length;
  const rankRows = (ranks ?? []) as RankRow[];
  const thisWeekRanks = rankRows.filter((row) => {
    const created = chicagoDateString(new Date(row.created_at));
    return created >= weekStart;
  });
  const priorRows = rankRows.filter((row) => {
    const created = chicagoDateString(new Date(row.created_at));
    return created < weekStart;
  });
  const priorBestByExercise: Record<string, number> = {};
  for (const row of [...priorRows].reverse()) {
    const prev = priorBestByExercise[row.exercise_id];
    if (prev == null || Number(row.score) > prev) {
      priorBestByExercise[row.exercise_id] = Number(row.score);
    }
  }

  const quests = weeklyQuests({
    sessionPostCount: weekPosts,
    hasPriorRanks: priorRows.length > 0,
    priorBestByExercise,
    thisWeekRanks: thisWeekRanks.map((row) => ({
      exerciseId: row.exercise_id,
      score: Number(row.score),
    })),
  });

  const rankHighlights: RankHighlight[] = rankRows.slice(0, 4).map((row) => ({
    exerciseName: row.exercise?.name ?? "Lift",
    band: row.band,
    detail: row.detail,
  }));

  return {
    streak,
    quests,
    rankHighlights,
    weekStart,
  };
}

export function sessionPostBody(ranks: PersonalLiftRank[]): string {
  if (ranks.length === 0) {
    return "Session posted. Log bodyweight to rank loaded lifts.";
  }
  const lines = ranks.map((rank) => formatRankLine(rank));
  return `Locked in ranks from today's session.\n${lines.join("\n")}`;
}
