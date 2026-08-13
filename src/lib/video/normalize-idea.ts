import type {
  ShortFormVideoIdea,
  ShortFormVideoIdeaKind,
} from "@/lib/video/video-studio";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function coerceScriptBeats(
  value: unknown,
): ShortFormVideoIdea["scriptBeats"] | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const hook = typeof row.hook === "string" ? row.hook.trim() : "";
  const tip = typeof row.tip === "string" ? row.tip.trim() : "";
  const cta = typeof row.cta === "string" ? row.cta.trim() : "";
  if (!hook && !tip && !cta) return null;
  return { hook, tip, cta };
}

function coerceKind(value: unknown): ShortFormVideoIdeaKind {
  return value === "exercise_howto" ? "exercise_howto" : "blog";
}

/**
 * Normalize a single idea from AI output or jsonb storage.
 * Preserves exercise how-to fields (form tips, VO script, exercise link).
 */
export function normalizeVideoIdea(item: unknown): ShortFormVideoIdea | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return null;

  const kind = coerceKind(row.kind);
  const videoHook =
    (typeof row.videoHook === "string" && row.videoHook.trim()) ||
    (typeof row.hook === "string" && row.hook.trim()) ||
    "";

  const shootingConcept =
    (typeof row.shootingConcept === "string" && row.shootingConcept.trim()) ||
    (Array.isArray(row.shotList)
      ? asStringArray(row.shotList).join(" · ")
      : "") ||
    (typeof row.whyItWorks === "string" ? row.whyItWorks.trim() : "");

  const formTips = asStringArray(row.formTips).slice(0, 6);
  const voiceoverScript =
    typeof row.voiceoverScript === "string"
      ? row.voiceoverScript.trim()
      : typeof row.voiceOverScript === "string"
        ? row.voiceOverScript.trim()
        : "";

  const exerciseId =
    typeof row.exerciseId === "string" && row.exerciseId.trim()
      ? row.exerciseId.trim()
      : typeof row.exercise_id === "string" && row.exercise_id.trim()
        ? row.exercise_id.trim()
        : null;
  const exerciseName =
    typeof row.exerciseName === "string" && row.exerciseName.trim()
      ? row.exerciseName.trim()
      : typeof row.exercise_name === "string" && row.exercise_name.trim()
        ? row.exercise_name.trim()
        : null;

  return {
    title,
    videoHook,
    shootingConcept,
    kind,
    exerciseId: kind === "exercise_howto" ? exerciseId : null,
    exerciseName: kind === "exercise_howto" ? exerciseName : null,
    formTips: kind === "exercise_howto" && formTips.length ? formTips : null,
    voiceoverScript: voiceoverScript || null,
    scriptBeats: coerceScriptBeats(row.scriptBeats),
    spokenLines: asStringArray(row.spokenLines).slice(0, 12),
    durationSec:
      typeof row.durationSec === "number" && Number.isFinite(row.durationSec)
        ? Math.round(row.durationSec)
        : null,
    filmMode: row.filmMode === "talking_head" ? "talking_head" : "silent_vo",
    shotList: asStringArray(row.shotList).slice(0, 8),
    coachNote:
      typeof row.coachNote === "string" && row.coachNote.trim()
        ? row.coachNote.trim()
        : null,
  };
}

export function normalizeVideoIdeas(
  value: unknown,
  max = 5,
): ShortFormVideoIdea[] {
  if (!Array.isArray(value)) return [];
  const out: ShortFormVideoIdea[] = [];
  for (const item of value) {
    const idea = normalizeVideoIdea(item);
    if (!idea) continue;
    out.push(idea);
    if (out.length >= max) break;
  }
  return out;
}

/** Serialize for jsonb persistence (drop empties that confuse older readers). */
export function serializeVideoIdea(idea: ShortFormVideoIdea): ShortFormVideoIdea {
  const kind = idea.kind === "exercise_howto" ? "exercise_howto" : "blog";
  return {
    title: idea.title.trim(),
    videoHook: (idea.videoHook ?? "").trim(),
    shootingConcept: (idea.shootingConcept ?? "").trim(),
    kind,
    exerciseId: kind === "exercise_howto" ? idea.exerciseId ?? null : null,
    exerciseName: kind === "exercise_howto" ? idea.exerciseName ?? null : null,
    formTips:
      kind === "exercise_howto" && idea.formTips?.length
        ? idea.formTips.map((t) => t.trim()).filter(Boolean).slice(0, 6)
        : null,
    voiceoverScript: (idea.voiceoverScript ?? "").trim() || null,
    scriptBeats: idea.scriptBeats ?? null,
    spokenLines: idea.spokenLines?.map((l) => l.trim()).filter(Boolean).slice(0, 12) ?? null,
    durationSec: idea.durationSec ?? null,
    filmMode: idea.filmMode === "talking_head" ? "talking_head" : "silent_vo",
    shotList: idea.shotList?.map((s) => s.trim()).filter(Boolean).slice(0, 8) ?? null,
    coachNote: (idea.coachNote ?? "").trim() || null,
  };
}
