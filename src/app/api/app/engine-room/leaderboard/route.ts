import { NextResponse } from "next/server";
import type { LeaderboardClass } from "@/lib/fitness/leaderboard";
import { loadLeaderboards } from "@/lib/fitness/leaderboard-query";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const CLASSES = new Set<LeaderboardClass>([
  "strength",
  "endurance",
  "weight_loss",
]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("fitness_profiles")
    .select("leaderboard_opt_in")
    .eq("id", user.id)
    .maybeSingle();
  if (profile && profile.leaderboard_opt_in === false) {
    return NextResponse.json({ ok: true, optedIn: false, boards: [] });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Leaderboards are unavailable right now." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const klassRaw = searchParams.get("class") ?? "strength";
  const klass = CLASSES.has(klassRaw as LeaderboardClass)
    ? (klassRaw as LeaderboardClass)
    : "strength";
  const exerciseId = searchParams.get("exercise_id")?.trim() || null;

  const result = await loadLeaderboards(admin, {
    klass,
    exerciseId,
    viewerId: user.id,
  });

  return NextResponse.json({
    ok: true,
    optedIn: result.optedIn,
    class: klass,
    boards: result.boards,
  });
}
