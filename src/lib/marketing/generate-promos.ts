import {
  createGeminiClient,
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/ai/gemini";
import type { GeneratedPromos } from "@/lib/marketing/project";
import { absoluteUrl } from "@/lib/seo/site";
import { NO_EM_DASH_RULE, stripEmDashes } from "@/lib/text/humanize-copy";

export type PromoGenerationInput = {
  title: string;
  excerpt?: string | null;
  bodyMarkdown: string;
  slug: string;
};

/**
 * Generate Facebook / Instagram / X promo captions for a published Chronicle.
 * Every caption ends with the live blog URL for the circular marketing loop.
 */
export async function generateMarketingPromos(
  input: PromoGenerationInput,
): Promise<GeneratedPromos> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const blogUrl = absoluteUrl(`/blog/${input.slug}`);
  const model = getGeminiModel();
  const ai = createGeminiClient(apiKey);

  const bodySnippet = input.bodyMarkdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4500);

  const prompt = [
    "You are the Vitality Sweat social media copywriter for Sweatlife Chronicles.",
    "Hunter Broussard is a 17-year-old athlete. Voice: real gym energy, clear, motivating. Never corporate fluff.",
    "Write THREE platform-specific promo captions that drive clicks back to the live blog post.",
    "",
    "PLATFORM RULES:",
    "- facebook: authoritative, community-building, 2-4 short paragraphs OK, invite discussion.",
    "- instagram: hook-driven first line for a feed post that will use the blog cover photo as the image. Emoji sparingly, line breaks welcome. Caption only (no image description).",
    "- x: punchy short-form under 260 characters BEFORE the URL (URL is appended separately). Tag voice fits @vitalitysweat.",
    "",
    "CRITICAL:",
    "- Do NOT invent PRs, weights, or claims absent from the article.",
    "- Do NOT include the blog URL in your JSON strings. The server appends it.",
    `- ${NO_EM_DASH_RULE}`,
    "- Return ONLY valid JSON (no markdown fences) with keys: facebook, instagram, x.",
    "",
    `TITLE: ${input.title}`,
    input.excerpt ? `EXCERPT: ${input.excerpt}` : null,
    `ARTICLE BODY (plain text):\n${bodySnippet || "(empty)"}`,
    `LIVE POST URL (for context only; do not paste into captions): ${blogUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const raw = (response.text ?? "").trim();
  if (!raw) {
    throw new Error("Gemini returned empty promo copy.");
  }

  const parsed = parsePromoJson(raw);
  return {
    facebook: stripEmDashes(appendBlogUrl(parsed.facebook, blogUrl)),
    instagram: stripEmDashes(appendBlogUrl(parsed.instagram, blogUrl)),
    x: stripEmDashes(appendBlogUrl(truncateForX(parsed.x), blogUrl)),
    blogUrl,
    generatedAt: new Date().toISOString(),
    model,
  };
}

function parsePromoJson(raw: string): {
  facebook: string;
  instagram: string;
  x: string;
} {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned unusable promo JSON.");
  }

  const row =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};

  const facebook = pickCaption(row, ["facebook", "fb", "Facebook"]);
  const instagram = pickCaption(row, ["instagram", "ig", "Instagram"]);
  const x = pickCaption(row, ["x", "twitter", "X", "Twitter"]);

  if (!facebook || !instagram || !x) {
    throw new Error("Gemini promo JSON missing facebook, instagram, or x.");
  }

  return { facebook, instagram, x };
}

function pickCaption(
  row: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function appendBlogUrl(caption: string, blogUrl: string): string {
  const trimmed = caption.trim();
  if (trimmed.includes(blogUrl)) return trimmed;
  return `${trimmed}\n\n${blogUrl}`;
}

/** Keep room for newline + URL under X's 280 limit. */
function truncateForX(caption: string): string {
  const max = 240;
  const trimmed = caption.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).replace(/\s+\S*$/, "").trimEnd()}…`;
}
