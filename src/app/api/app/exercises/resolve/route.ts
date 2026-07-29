import { NextResponse } from "next/server";
import {
  buildResolveExercisePrompt,
  parseResolveExerciseResult,
} from "@/lib/ai/exercises";
import {
  createGeminiClient,
  getGeminiApiKey,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import {
  findAmbiguousLocalMatches,
  findLocalExerciseMatch,
  isExerciseCategory,
  isExerciseEquipment,
  type CatalogExerciseSummary,
} from "@/lib/fitness/exercises";
import type { Exercise } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 60;

type ResolveBody = {
  query?: string;
  equipment?: string;
  category?: string;
};

/**
 * Match an existing exercise (including synonyms) or create a new catalog row.
 * Local exact/alias match runs first; Gemini only when needed.
 */
export async function POST(request: Request) {
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

    let body: ResolveBody;
    try {
      body = (await request.json()) as ResolveBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const query = (body.query ?? "").trim();
    if (query.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Type at least 2 characters for the exercise." },
        { status: 400 },
      );
    }

    const equipmentHint = isExerciseEquipment(body.equipment)
      ? body.equipment
      : null;
    const categoryHint = isExerciseCategory(body.category)
      ? body.category
      : null;

    const { data: rows, error: listError } = await supabase
      .from("exercises")
      .select(
        "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(400);

    if (listError) {
      return NextResponse.json(
        { ok: false, error: listError.message },
        { status: 500 },
      );
    }

    const exercises = (rows as Exercise[] | null) ?? [];
    const local = findLocalExerciseMatch(exercises, query);
    if (local) {
      return NextResponse.json({
        ok: true,
        created: false,
        matched: true,
        source: "local",
        reason: "Exact or alias match in your library.",
        exercise: local,
      });
    }

    const ambiguousLocal = findAmbiguousLocalMatches(exercises, query);
    if (ambiguousLocal.length >= 2) {
      return NextResponse.json({
        ok: true,
        created: false,
        matched: false,
        ambiguous: true,
        source: "local",
        reason:
          "A few library exercises could fit — pick the one you mean, or look up something else.",
        candidates: ambiguousLocal,
      });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GEMINI_API_KEY is not configured on the server. Add it and restart, or pick an exercise from the list.",
        },
        { status: 503 },
      );
    }

    const catalog: CatalogExerciseSummary[] = exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      aliases: Array.isArray(ex.aliases) ? ex.aliases : [],
      category: String(ex.category ?? "strength"),
      equipment: String(ex.equipment ?? "free_weight"),
    }));
    const catalogIds = new Set(catalog.map((c) => c.id));

    const model = getGeminiModel();
    const prompt = buildResolveExercisePrompt({
      query,
      equipment: equipmentHint,
      category: categoryHint,
      catalog,
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
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an empty exercise response.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }

      const parsed = parseResolveExerciseResult(raw, catalogIds);
      if (!parsed) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Gemini could not resolve that exercise. Try a clearer name or pick from the list.",
            provider: "gemini",
            model,
            raw: raw.slice(0, 800),
          },
          { status: 502 },
        );
      }

      if (parsed.action === "match") {
        const matched = exercises.find((ex) => ex.id === parsed.exerciseId);
        if (!matched) {
          return NextResponse.json(
            { ok: false, error: "Matched exercise no longer exists." },
            { status: 404 },
          );
        }
        return NextResponse.json({
          ok: true,
          created: false,
          matched: true,
          source: "gemini",
          reason: parsed.reason,
          exercise: matched,
        });
      }

      if (parsed.action === "choose") {
        const candidates = parsed.exerciseIds
          .map((id) => exercises.find((ex) => ex.id === id))
          .filter((ex): ex is Exercise => Boolean(ex));
        if (candidates.length >= 2) {
          return NextResponse.json({
            ok: true,
            created: false,
            matched: false,
            ambiguous: true,
            source: "gemini",
            reason: parsed.reason,
            candidates,
          });
        }
        if (candidates.length === 1) {
          return NextResponse.json({
            ok: true,
            created: false,
            matched: true,
            source: "gemini",
            reason: parsed.reason,
            exercise: candidates[0],
          });
        }
        return NextResponse.json(
          {
            ok: false,
            error:
              "Gemini suggested options that are no longer in the library. Try again.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }

      // Final server-side duplicate guard before insert.
      const duplicate = findLocalExerciseMatch(exercises, parsed.name);
      if (duplicate) {
        return NextResponse.json({
          ok: true,
          created: false,
          matched: true,
          source: "server_dedupe",
          reason: `Matched existing “${duplicate.name}” instead of creating a duplicate.`,
          exercise: duplicate,
        });
      }

      const { data: created, error: insertError } = await supabase
        .from("exercises")
        .insert({
          name: parsed.name,
          aliases: parsed.aliases,
          category: categoryHint ?? parsed.category,
          equipment: equipmentHint ?? parsed.equipment,
          primary_muscle: parsed.primaryMuscle,
          tracking_type: parsed.trackingType,
          is_active: true,
          created_by: user.id,
        })
        .select(
          "id, name, category, primary_muscle, equipment, aliases, tracking_type, is_active, created_by, created_at, updated_at",
        )
        .single();

      if (insertError) {
        // Unique global-name race — re-fetch by name.
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
          return NextResponse.json({
            ok: true,
            created: false,
            matched: true,
            source: "server_dedupe",
            reason: `“${existing.name}” was already in the library.`,
            exercise: existing,
          });
        }

        return NextResponse.json(
          { ok: false, error: insertError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        created: true,
        matched: false,
        source: "gemini",
        reason: parsed.reason,
        exercise: created,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gemini request failed.";
      const connection = isLikelyConnectionError(error);
      return NextResponse.json(
        {
          ok: false,
          provider: "gemini",
          model,
          error: connection
            ? "Gemini connection dropped or timed out. Retry in a moment."
            : message,
          connectionError: connection,
        },
        { status: connection ? 504 : 502 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
