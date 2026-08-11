import type { SupabaseClient } from "@supabase/supabase-js";

export type StrengthExerciseCandidate = {
  id: string;
  name: string;
  primaryMuscle: string | null;
  equipment: string | null;
};

/**
 * Pick active strength exercises that still need a how-to YouTube Short.
 * Random-ish sample so each marketing project does not always suggest the same two.
 */
export async function pickStrengthExercisesNeedingVideo(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    excludeIds?: string[];
  } = {},
): Promise<StrengthExerciseCandidate[]> {
  const limit = Math.min(Math.max(options.limit ?? 2, 1), 8);
  const exclude = new Set(
    (options.excludeIds ?? []).map((id) => id.trim()).filter(Boolean),
  );

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, youtube_url")
    .eq("is_active", true)
    .eq("category", "strength")
    .order("name", { ascending: true })
    .limit(120);

  if (error || !data?.length) return [];

  const pool = data
    .filter((row) => {
      if (exclude.has(row.id as string)) return false;
      const url =
        typeof row.youtube_url === "string" ? row.youtube_url.trim() : "";
      return !url;
    })
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      primaryMuscle:
        typeof row.primary_muscle === "string" ? row.primary_muscle : null,
      equipment: typeof row.equipment === "string" ? row.equipment : null,
    }));

  if (pool.length <= limit) return pool;

  // Fisher-Yates partial shuffle for a fresh pair each project.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, limit);
}
