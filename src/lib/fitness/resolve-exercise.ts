import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildResolveExercisePrompt,
  parseResolveExerciseResult,
} from "@/lib/ai/exercises";
import {
  createGeminiClient,
  formatGeminiError,
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/ai/gemini";
import {
  findLocalExerciseMatch,
  rankLocalExerciseMatches,
  type CatalogExerciseSummary,
} from "@/lib/fitness/exercises";
import type { Exercise } from "@/lib/fitness/types";

export type ResolveExerciseOutcome =
  | { ok: true; exercise: Exercise; created: boolean; source: string }
  | { ok: false; error: string };

/**
 * Resolve an exercise name to a catalog row for AI program generation.
 * Prefers local catalog matches; uses Gemini only when needed; auto-picks
 * among ambiguous options (no UI) so plan generation can finish unattended.
 */
export async function resolveExerciseForProgram(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  catalog: Exercise[],
  cache: Map<string, Exercise>,
): Promise<ResolveExerciseOutcome> {
  const key = query.trim().toLowerCase();
  if (!key) {
    return { ok: false, error: "Empty exercise name." };
  }

  const cached = cache.get(key);
  if (cached) {
    return { ok: true, exercise: cached, created: false, source: "cache" };
  }

  const local = findLocalExerciseMatch(catalog, query);
  if (local) {
    cache.set(key, local);
    return { ok: true, exercise: local, created: false, source: "local" };
  }

  // For plan generation, auto-pick a strong fuzzy catalog hit instead of creating.
  const ranked = rankLocalExerciseMatches(catalog, query);
  const top = ranked[0];
  if (top && top.score >= 78) {
    cache.set(key, top.exercise);
    return {
      ok: true,
      exercise: top.exercise,
      created: false,
      source: "local_fuzzy",
    };
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    // Last resort: still use best weak local match if any.
    if (top) {
      cache.set(key, top.exercise);
      return {
        ok: true,
        exercise: top.exercise,
        created: false,
        source: "local_fallback",
      };
    }
    return {
      ok: false,
      error: `Could not resolve “${query}” and GEMINI_API_KEY is not configured.`,
    };
  }

  const summary: CatalogExerciseSummary[] = catalog.map((ex) => ({
    id: ex.id,
    name: ex.name,
    aliases: Array.isArray(ex.aliases) ? ex.aliases : [],
    category: String(ex.category ?? "strength"),
    equipment: String(ex.equipment ?? "free_weight"),
  }));
  const catalogIds = new Set(summary.map((c) => c.id));
  const model = getGeminiModel();
  const prompt = buildResolveExercisePrompt({
    query,
    catalog: summary,
  });

  try {
    const ai = createGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const raw = (response.text ?? "").trim();
    if (!raw) {
      return { ok: false, error: `Gemini returned empty resolve for “${query}”.` };
    }

    const parsed = parseResolveExerciseResult(raw, catalogIds);
    if (!parsed) {
      if (top) {
        cache.set(key, top.exercise);
        return {
          ok: true,
          exercise: top.exercise,
          created: false,
          source: "local_fallback",
        };
      }
      return {
        ok: false,
        error: `Could not resolve “${query}” from Gemini output.`,
      };
    }

    if (parsed.action === "match") {
      const matched = catalog.find((ex) => ex.id === parsed.exerciseId);
      if (!matched) {
        return { ok: false, error: `Matched exercise missing for “${query}”.` };
      }
      cache.set(key, matched);
      return { ok: true, exercise: matched, created: false, source: "gemini" };
    }

    if (parsed.action === "choose") {
      const pick =
        parsed.exerciseIds
          .map((id) => catalog.find((ex) => ex.id === id))
          .find((ex): ex is Exercise => Boolean(ex)) ?? null;
      if (pick) {
        cache.set(key, pick);
        return { ok: true, exercise: pick, created: false, source: "gemini_choose" };
      }
      return { ok: false, error: `Ambiguous resolve failed for “${query}”.` };
    }

    // create — still dedupe against catalog first
    const duplicate = findLocalExerciseMatch(catalog, parsed.name);
    if (duplicate) {
      cache.set(key, duplicate);
      cache.set(parsed.name.trim().toLowerCase(), duplicate);
      return {
        ok: true,
        exercise: duplicate,
        created: false,
        source: "server_dedupe",
      };
    }

    const { data: created, error: insertError } = await supabase
      .from("exercises")
      .insert({
        name: parsed.name,
        aliases: parsed.aliases,
        category: parsed.category,
        equipment: parsed.equipment,
        primary_muscle: parsed.primaryMuscle,
        tracking_type: parsed.trackingType,
        is_active: true,
        created_by: userId,
      })
      .select(
        "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
      )
      .single();

    if (insertError) {
      const { data: existing } = await supabase
        .from("exercises")
        .select(
          "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
        )
        .ilike("name", parsed.name)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const row = existing as Exercise;
        catalog.push(row);
        cache.set(key, row);
        return {
          ok: true,
          exercise: row,
          created: false,
          source: "server_dedupe",
        };
      }

      return { ok: false, error: insertError.message };
    }

    const row = created as Exercise;
    catalog.push(row);
    cache.set(key, row);
    cache.set(parsed.name.trim().toLowerCase(), row);
    return { ok: true, exercise: row, created: true, source: "gemini_create" };
  } catch (error) {
    if (top) {
      cache.set(key, top.exercise);
      return {
        ok: true,
        exercise: top.exercise,
        created: false,
        source: "local_fallback",
      };
    }
    return { ok: false, error: formatGeminiError(error) };
  }
}
