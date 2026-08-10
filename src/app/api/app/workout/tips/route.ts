import { NextResponse } from "next/server";
import {
  blogSearchTerms,
  pickCuratedWorkoutTip,
  type WorkoutTip,
  type WorkoutTipKind,
} from "@/lib/fitness/workout-tips";
import type { PrimaryGoal } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const PRIMARY_GOALS = new Set<PrimaryGoal>([
  "weight_loss",
  "muscle_gain",
  "strength",
  "endurance",
  "general_fitness",
  "sports_training",
  "marathon_training",
]);

function parseGoal(raw: string | null): PrimaryGoal | null {
  if (!raw) return null;
  return PRIMARY_GOALS.has(raw as PrimaryGoal) ? (raw as PrimaryGoal) : null;
}

function parseExclude(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function parsePreferKind(raw: string | null): WorkoutTipKind | null {
  if (raw === "coaching" || raw === "fuel" || raw === "chronicle") return raw;
  return null;
}

/**
 * Non-Gemini tips for active sessions: curated coaching/fuel chips,
 * plus an occasional Chronicle teaser from published posts.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    let goal = parseGoal(url.searchParams.get("goal"));
    const exerciseId = url.searchParams.get("exercise_id")?.trim() || null;
    const sessionId = url.searchParams.get("session_id")?.trim() || null;
    const excludeIds = parseExclude(url.searchParams.get("exclude"));
    const preferKind =
      parsePreferKind(url.searchParams.get("prefer_kind")) ??
      rotatePreferKind(excludeIds.length);

    if (!goal) {
      const { data: profile } = await supabase
        .from("fitness_profiles")
        .select("primary_goal")
        .eq("user_id", user.id)
        .maybeSingle();
      goal = parseGoal(
        typeof profile?.primary_goal === "string" ? profile.primary_goal : null,
      );
    }

    let muscle: string | null = url.searchParams.get("muscle")?.trim() || null;
    let exerciseName: string | null = null;
    if (exerciseId) {
      const { data: exercise } = await supabase
        .from("exercises")
        .select("name, primary_muscle")
        .eq("id", exerciseId)
        .maybeSingle();
      if (exercise) {
        exerciseName = typeof exercise.name === "string" ? exercise.name : null;
        if (!muscle && typeof exercise.primary_muscle === "string") {
          muscle = exercise.primary_muscle;
        }
      }
    }

    // ~1 in 3 requests: try a Chronicle teaser when preferKind allows.
    const wantChronicle =
      preferKind === "chronicle" ||
      (preferKind == null && hashSalt(`${sessionId ?? ""}:${excludeIds.length}`) % 3 === 0);

    if (wantChronicle && !excludeIds.some((id) => id.startsWith("chronicle:"))) {
      const chronicle = await pickChronicleTip(supabase, {
        goal,
        muscle,
        exerciseName,
        excludeIds,
      });
      if (chronicle) {
        return NextResponse.json({ ok: true, tip: chronicle });
      }
    }

    const curated = pickCuratedWorkoutTip({
      goal,
      muscle,
      excludeIds,
      preferKind: preferKind === "chronicle" ? "coaching" : preferKind,
      salt: `${sessionId ?? "s"}:${exerciseId ?? "e"}:${excludeIds.join(",")}`,
    });

    return NextResponse.json({ ok: true, tip: curated });
  } catch (err) {
    console.error("[workout/tips]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}

function rotatePreferKind(shownCount: number): WorkoutTipKind | null {
  const order: WorkoutTipKind[] = ["coaching", "fuel", "chronicle"];
  return order[shownCount % order.length] ?? null;
}

function hashSalt(salt: string): number {
  let hash = 0;
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  }
  return hash;
}

async function pickChronicleTip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    goal: PrimaryGoal | null;
    muscle: string | null;
    exerciseName: string | null;
    excludeIds: string[];
  },
): Promise<WorkoutTip | null> {
  const terms = blogSearchTerms(input);
  const { data: rows } = await supabase
    .from("posts")
    .select("id, slug, title, excerpt, description, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  if (!rows || rows.length === 0) return null;

  type PostRow = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    description: string | null;
  };

  const candidates = (rows as PostRow[]).filter((row) => {
    const tipId = `chronicle:${row.slug}`;
    if (input.excludeIds.includes(tipId)) return false;
    const hay = `${row.title} ${row.excerpt ?? ""} ${row.description ?? ""}`.toLowerCase();
    return terms.some((term) => hay.includes(term));
  });

  const pick =
    candidates[hashSalt(terms.join("|") + input.excludeIds.length) % candidates.length] ??
    (rows as PostRow[]).find(
      (row) => !input.excludeIds.includes(`chronicle:${row.slug}`),
    );

  if (!pick?.slug) return null;

  const excerpt = (pick.excerpt || pick.description || pick.title || "").trim();
  const body =
    excerpt.length > 140 ? `${excerpt.slice(0, 137).trimEnd()}...` : excerpt;

  return {
    id: `chronicle:${pick.slug}`,
    kind: "chronicle",
    title: pick.title?.trim() || "From the Chronicle",
    body: body || "A short read from the Vitality library.",
    href: `/app/library/${pick.slug}`,
  };
}
