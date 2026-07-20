/**
 * Visual style rules derived from the Vitality Sweat Brand Guide
 * (https://drive.google.com/file/d/1zphyMsEs-I46sy2xYu8H1S8NJ06LmPu5/view?usp=sharing)
 * and in-repo tokens in `tailwind.config.ts` / `globals.css`.
 */

export const BRAND_GUIDE_URL =
  "https://drive.google.com/file/d/1zphyMsEs-I46sy2xYu8H1S8NJ06LmPu5/view?usp=sharing";

export const BRAND_VISUAL_TOKENS = {
  ink: "#404040",
  muted: "#6f6b6b",
  orange: "#ff6600",
  orangeDeep: "#e55c00",
  surface: "#f4f2ef",
  surfaceElevated: "#ffffff",
  surfaceDark: "#1a1a1a",
  displayTypography: "Vesper Libre (serif display) — medium weight headlines",
  bodyTypography: "Source Sans 3 (clean sans) — readable body",
} as const;

/**
 * Packages a Gemini image prompt so output matches Vitality Sweat premium brand look.
 */
export function buildBrandVisualAidPrompt(input: {
  title: string;
  excerpt: string;
  notes: string;
  bodyMarkdown: string;
}): string {
  const subjectHints = [
    input.title && `Article title: ${input.title}`,
    input.excerpt && `Excerpt: ${input.excerpt}`,
    input.notes && `Creator notes:\n${input.notes}`,
    input.bodyMarkdown &&
      `Draft body context (use for subject, not for rendering long text):\n${input.bodyMarkdown.slice(0, 1800)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    "Generate ONE premium editorial visual aid for the Vitality Sweat / Sweatlife Chronicles blog.",
    "This is a finished graphic for a fitness + youth baseball lifestyle publication — cohesive, athletic, and premium.",
    "",
    "STRICT brand visual rules (from the master Brand Guide PDF and site tokens):",
    `- Brand guide reference: ${BRAND_GUIDE_URL}`,
    `- Primary ink / charcoal: ${BRAND_VISUAL_TOKENS.ink}`,
    `- Muted charcoal secondary: ${BRAND_VISUAL_TOKENS.muted}`,
    `- Accent orange ONLY: ${BRAND_VISUAL_TOKENS.orange} (deep accent ${BRAND_VISUAL_TOKENS.orangeDeep})`,
    `- Soft warm surface / paper tone: ${BRAND_VISUAL_TOKENS.surface}`,
    `- Elevated white panels: ${BRAND_VISUAL_TOKENS.surfaceElevated}`,
    `- Dark athletic plane when needed: ${BRAND_VISUAL_TOKENS.surfaceDark}`,
    `- Typography expectation if any text appears: ${BRAND_VISUAL_TOKENS.displayTypography}; supporting labels in ${BRAND_VISUAL_TOKENS.bodyTypography}.`,
    "- Prefer Vesper Libre–like serif for any short headline overlay; Source Sans–like sans for small labels.",
    "- Orange is an accent spark — never purple, never neon glow stacks, never generic AI purple gradients.",
    "- Avoid cluttered dashboards, floating stickers, emoji, and multi-layer drop shadows.",
    "- Composition: one clear subject, generous breathing room, edge-aware editorial crop (blog-ready 16:9).",
    "- Mood: sweaty effort, local pride, confident coaching energy — Southwest Louisiana / diamond / training culture.",
    "- If text is rendered, keep it minimal (3–6 words max), high-contrast, and brand-aligned — never fill the frame with paragraphs.",
    "",
    "Subject direction from the creator draft:",
    subjectHints || "Athletic training / Sweatlife Chronicles editorial scene.",
    "",
    "Output a single high-quality image suitable as an in-article visual aid.",
  ].join("\n");
}

export function buildSeoImageBasename(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const stamp = Date.now().toString(36);
  return `vitality-sweat-${slug || "visual-aid"}-${stamp}`;
}
