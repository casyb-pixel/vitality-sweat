import { BRAND_VISUAL_TOKENS, BRAND_GUIDE_URL } from "@/lib/ai/brand-visual";

export type StructuredArticleDraft = {
  title: string;
  excerpt: string;
  description: string;
  keywords: string[];
  bodyMarkdown: string;
  visualSubject: string;
};

/**
 * Structural editor brief: rewrite Hunter's rough daily notes into a
 * publish-ready Sweatlife Chronicle using the house voice and layout rules.
 */
export function buildBrandStructurePrompt(input: {
  notes: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
}): string {
  return [
    "You are the Vitality Sweat primary structural editor for Sweatlife Chronicles.",
    "Your job: take Hunter's raw daily fitness notes (workouts, practices, meals) and rewrite them into a complete, publish-ready blog article.",
    "",
    "TONE RULES:",
    "- Direct, sweaty, encouraging — a coach talking to athletes, never corporate or fluffy.",
    "- First-person perspective from Hunter where the notes are personal; practical instruction elsewhere.",
    "- Audience: athletes, parents of youth baseball players, and everyday fitness readers in Southwest Louisiana and beyond.",
    "",
    "STRUCTURE RULES:",
    "- Target word count: 900–1400.",
    "- Open with a 2–3 paragraph hook grounded in the day's real training moment.",
    "- Organize the body with ## H2 sections (3–5) and ### H3 subsections where useful.",
    "- Use - bullet lists for exercises, meals, and step-by-step cues.",
    "- Close with a short actionable takeaway and a one-line CTA.",
    "- Use markdown only: paragraphs, ## H2, ### H3, and - bullet lists. Do NOT invent HTML.",
    "- Do NOT include images in bodyMarkdown (the pipeline injects a text-free background visual separately).",
    "",
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    JSON.stringify({
      title: "string",
      excerpt: "string",
      description: "string",
      keywords: ["string"],
      bodyMarkdown: "string — full article in markdown with ## / ### / paragraphs / lists",
      visualSubject:
        "string — 8–16 words describing the scene subject for a text-free background photo (no typography)",
    }),
    "",
    input.title ? `Working title:\n${input.title}` : null,
    input.excerpt ? `Current excerpt:\n${input.excerpt}` : null,
    input.notes ? `Hunter rough notes:\n${input.notes}` : null,
    input.bodyMarkdown
      ? `Existing draft body:\n${input.bodyMarkdown.slice(0, 4000)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Programmatic, text-free background image prompt — no model-authored copy overlays.
 * Uses structured subject + fixed brand visual constraints.
 */
export function buildTextFreeBackgroundPrompt(input: {
  title: string;
  visualSubject: string;
  excerpt?: string;
}): string {
  const subject =
    input.visualSubject.trim() ||
    `Athletic training atmosphere inspired by: ${input.title}`;

  return [
    "Generate ONE text-free editorial background photograph for a Sweatlife Chronicles blog hero/layout.",
    "CRITICAL: Absolutely no text, letters, numbers, logos, watermarks, captions, posters, or typography of any kind in the image.",
    "No UI chrome, no stickers, no badges, no floating labels.",
    "",
    "Brand visual constraints (Vitality Sweat Brand Guide):",
    `- Guide: ${BRAND_GUIDE_URL}`,
    `- Color grade toward charcoal ink ${BRAND_VISUAL_TOKENS.ink}, muted ${BRAND_VISUAL_TOKENS.muted}, warm surface ${BRAND_VISUAL_TOKENS.surface}, with restrained orange accent energy ${BRAND_VISUAL_TOKENS.orange} only in natural light/props — never purple neon gradients.`,
    "- Premium, cohesive, athletic editorial look — sweaty effort, local pride, diamond/training culture.",
    "- Composition: single clear subject, generous breathing room, edge-to-edge cinematic 16:9 crop suitable as a blog cover background.",
    "- Soft depth of field; realistic photography (not cartoon, not 3D render).",
    "",
    `Scene subject: ${subject}`,
    input.excerpt
      ? `Mood cue from article excerpt (do not render as text): ${input.excerpt.slice(0, 220)}`
      : null,
    `Article context title (do not render as text): ${input.title}`,
  ]
    .filter(Boolean)
    .join("\n");
}
