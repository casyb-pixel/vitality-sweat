import type { SupabaseClient } from "@supabase/supabase-js";

export type SweatScoreBreakdown = {
  score: number;
  training: number;
  overload: number;
  fuel: number;
  recovery: number;
  streakDays: number;
  weekStart: string;
};

function mondayISO(d = new Date()): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export async function computeSweatScore(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<SweatScoreBreakdown> {
  const weekStart = mondayISO(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [{ data: sessions }, { data: fuel }, { data: program }] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("id, status, started_at")
        .eq("user_id", userId)
        .gte("started_at", `${weekStart}T00:00:00`)
        .lt("started_at", weekEnd.toISOString()),
      supabase
        .from("fuel_logs")
        .select("logged_on")
        .eq("user_id", userId)
        .gte("logged_on", weekStart)
        .lt("logged_on", weekEnd.toISOString().slice(0, 10)),
      supabase
        .from("workout_programs")
        .select("days_per_week")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const planned = Math.max(1, Number(program?.days_per_week) || 3);
  const completed = (sessions ?? []).filter(
    (s) => s.status === "completed" || s.status === "active",
  ).length;
  const training = Math.min(30, Math.round((completed / planned) * 30));

  const overload = completed >= 3 ? 25 : completed >= 2 ? 18 : completed >= 1 ? 10 : 4;
  const fuelDays = (fuel ?? []).length;
  const fuelScore = Math.min(25, fuelDays * 5);
  const restDays = 7 - completed;
  const recovery = restDays >= 1 && restDays <= 4 ? 20 : restDays === 0 ? 8 : 12;

  const { data: recent } = await supabase
    .from("workout_sessions")
    .select("started_at, status")
    .eq("user_id", userId)
    .in("status", ["completed", "active"])
    .order("started_at", { ascending: false })
    .limit(14);

  let streakDays = 0;
  const seen = new Set<string>();
  for (const row of recent ?? []) {
    const day = String(row.started_at).slice(0, 10);
    if (seen.has(day)) continue;
    seen.add(day);
    streakDays += 1;
    if (seen.size > 7) break;
  }

  const score = Math.max(0, Math.min(100, training + overload + fuelScore + recovery));
  return {
    score,
    training,
    overload,
    fuel: fuelScore,
    recovery,
    streakDays,
    weekStart,
  };
}

export async function persistSweatScore(
  supabase: SupabaseClient,
  userId: string,
  breakdown: SweatScoreBreakdown,
) {
  await supabase.from("sweat_score_snapshots").upsert(
    {
      user_id: userId,
      week_start: breakdown.weekStart,
      score: breakdown.score,
      training_score: breakdown.training,
      overload_score: breakdown.overload,
      fuel_score: breakdown.fuel,
      recovery_score: breakdown.recovery,
      streak_days: breakdown.streakDays,
    },
    { onConflict: "user_id,week_start" },
  );
}
