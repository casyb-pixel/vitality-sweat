import type { ShortFormVideoIdea } from "@/lib/video/video-studio";

/** First sentence (or line) of Hunter's notes, capped for a card title. */
export function titleFromHunterNotes(notes: string): string {
  const first =
    notes
      .trim()
      .split(/[.!?\n]/)
      .map((part) => part.trim())
      .find(Boolean) ?? "";
  if (!first) return "Your idea";
  if (first.length <= 72) return first;
  return `${first.slice(0, 69).trim()}...`;
}

/** Blank Video Studio slot: Hunter's words, no AI script. */
export function buildCustomVideoIdea(input: {
  notes: string;
  title?: string;
}): ShortFormVideoIdea {
  const notes = input.notes.trim();
  const title = (input.title ?? "").trim() || titleFromHunterNotes(notes);
  return {
    title,
    videoHook: "",
    shootingConcept: notes,
    kind: "custom",
    exerciseId: null,
    exerciseName: null,
    formTips: null,
    voiceoverScript: null,
    scriptBeats: null,
    spokenLines: null,
    durationSec: null,
    filmMode: "talking_head",
    shotList: null,
    coachNote: notes || null,
  };
}
