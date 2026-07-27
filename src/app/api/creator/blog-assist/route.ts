import { NextResponse } from "next/server";
import { BRAND_GUIDE_URL, BRAND_VISUAL_TOKENS } from "@/lib/ai/brand-visual";
import {
  createGeminiClient,
  getGeminiApiKey,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import {
  fetchTavilyTrends,
  runTrendResearch,
  type TrendResearch,
} from "@/lib/ai/trend-search";
import { getCreatorRole } from "@/lib/auth/creator";
import type {
  BlogAssistAction,
  BlogIdeaOption,
  BlogImagePrompt,
  BlogSeoMetadata,
  FinalizedPostResult,
} from "@/lib/blog/blog-assist";
import {
  fingerprintSummary,
  getArchiveFingerprint,
} from "@/lib/blog/archive-fingerprint";
import { slugifyTitle } from "@/lib/blog/supabase-posts";
import { createClient } from "@/utils/supabase/server";

/**
 * Node runtime: @google/genai is more reliable here than Edge, and failures
 * stay JSON instead of Safari seeing HTML gateway pages as "pattern" errors.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export type {
  BlogAssistAction,
  BlogIdeaOption,
  BlogImagePrompt,
  BlogSeoMetadata,
  FinalizedPostResult,
};

type BlogAssistBody = {
  action?: BlogAssistAction;
  /** @deprecated Use `action` — mapped for older clients. */
  mode?: string;
  notes?: string;
  title?: string;
  targetAudience?: string;
  /** Phase 3 bulleted / fragment answers. */
  details?: string | string[];
  talkingPoints?: string[];
  answers?: { prompt?: string; answer?: string }[];
};

/**
 * Mobile creator workflow:
 * - generate_ideas → 3 trend-aware options (title, talkingPoints, targetAudience)
 * - finalize_post → polished archive-fingerprint markdown + imagePrompt
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return jsonError("Unauthorized — creator privileges required.", 401);
    }

    let body: BlogAssistBody;
    try {
      body = (await request.json()) as BlogAssistBody;
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    const action = resolveAction(body);
    if (!action) {
      return jsonError(
        'Send action: "generate_ideas" or "finalize_post".',
        400,
      );
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return jsonError(
        "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart Next.js.",
        503,
      );
    }

    if (action === "generate_ideas") {
      const notes = (body.notes ?? "").trim();
      if (!notes) {
        return jsonError(
          "Send Hunter's raw daily notes in the `notes` field.",
          400,
        );
      }
      return handleGenerateIdeas({ apiKey, notes });
    }

    const title = (body.title ?? "").trim();
    if (!title) {
      return jsonError("Send the selected `title` to finalize the post.", 400);
    }

    return handleFinalizePost({
      apiKey,
      title,
      notes: (body.notes ?? "").trim(),
      targetAudience: (body.targetAudience ?? "").trim(),
      details: collectDetails(body),
      talkingPoints: asStringArray(body.talkingPoints).slice(0, 3),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return jsonError(message, 500);
  }
}

function resolveAction(body: BlogAssistBody): BlogAssistAction | null {
  if (body.action === "generate_ideas" || body.action === "finalize_post") {
    return body.action;
  }
  // Transitional aliases from the previous wizard modes.
  if (
    body.mode === "trends" ||
    body.mode === "full" ||
    body.mode === "headlines"
  ) {
    return "generate_ideas";
  }
  if (body.mode === "draft" || body.mode === "structure") {
    return "finalize_post";
  }
  return null;
}

function collectDetails(body: BlogAssistBody): string {
  if (typeof body.details === "string" && body.details.trim()) {
    return body.details.trim();
  }
  if (Array.isArray(body.details)) {
    return body.details
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      .map((d) => `- ${d.trim()}`)
      .join("\n");
  }
  if (Array.isArray(body.answers)) {
    return body.answers
      .map((a) => {
        const prompt = typeof a?.prompt === "string" ? a.prompt.trim() : "";
        const answer = typeof a?.answer === "string" ? a.answer.trim() : "";
        if (!answer) return "";
        return prompt ? `Q: ${prompt}\nA: ${answer}` : `- ${answer}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

async function handleGenerateIdeas(input: { apiKey: string; notes: string }) {
  const model = getGeminiModel();
  const notes = input.notes.trim();

  // 1) Tavily live trends (preferred). Any network/rate-limit failure falls
  // through so Gemini can still pitch ideas from baseline fitness knowledge.
  let research: TrendResearch | null = null;
  let researchWarning: string | null = null;
  try {
    research = await fetchTavilyTrends({
      geminiApiKey: input.apiKey,
      notes,
    });
    if (!research) {
      // Key missing or empty — try the shared provider chain as a soft backup.
      research = await runTrendResearch({
        geminiApiKey: input.apiKey,
        notes,
      });
    }
  } catch (error) {
    research = null;
    researchWarning =
      error instanceof Error
        ? `Live trend search unavailable (${error.message}). Generating from Gemini baseline fitness knowledge so you can keep posting.`
        : "Live trend search unavailable. Generating from Gemini baseline fitness knowledge so you can keep posting.";
    console.warn("[blog-assist:generate_ideas]", researchWarning);
  }

  // 2) Synthesize Hunter's notes with (optional) Tavily findings → 3 options.
  const prompt = buildGenerateIdeasPrompt({ notes, research });

  try {
    const ai = createGeminiClient(input.apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const raw = (response.text ?? "").trim();
    if (!raw) {
      return jsonError("Gemini returned an empty response.", 502, {
        provider: "gemini",
        model,
        action: "generate_ideas",
      });
    }

    const parsed = parseIdeaOptions(raw);
    if (parsed.options.length < 1) {
      return jsonError(
        "Gemini did not return usable blog options. Try again.",
        502,
        {
          provider: "gemini",
          model,
          action: "generate_ideas",
          raw: raw.slice(0, 1500),
        },
      );
    }

    return NextResponse.json({
      ok: true,
      action: "generate_ideas" as const,
      provider: "gemini",
      model,
      summary: parsed.summary,
      // Strict array of 3 (or fewer if model under-delivered) wizard cards.
      options: parsed.options.slice(0, 3),
      research: research
        ? {
            provider: research.provider,
            queries: research.queries,
            sources: research.sources,
          }
        : null,
      researchWarning,
    });
  } catch (error) {
    return geminiErrorResponse(error, model, "generate_ideas");
  }
}

function buildGenerateIdeasPrompt(input: {
  notes: string;
  research: TrendResearch | null;
}): string {
  const trendBlock = input.research
    ? [
        `LIVE WEB TRENDS FROM ${input.research.provider.toUpperCase()}:`,
        "Use these current high-engagement articles, summaries, and angles as the market signal.",
        "Synthesize Hunter's real gym experience WITH these trends — each option must connect something authentic from his notes to something people are searching for right now.",
        input.research.findings.slice(0, 6000),
      ].join("\n")
    : [
        "LIVE WEB TRENDS: unavailable.",
        "Fall back to evergreen high-engagement fitness/nutrition search behavior (chest growth, progressive overload, athlete meals, recovery, youth baseball training).",
        "Still ground every option in Hunter's actual notes — invent nothing he didn't write.",
      ].join("\n");

  return [
    "You are the Vitality Sweat AI Blog Architect for Sweatlife Chronicles.",
    "Hunter is a 17-year-old high school athlete logging messy gym notes on his phone.",
    "Your job: synthesize his real-life training/nutrition experience with current search trends, then pitch content he can tap through on mobile.",
    "",
    "OUTPUT RULES:",
    "- Return exactly 3 DISTINCT blog options.",
    "- Each option must include title, talkingPoints (exactly 3 short gym-friendly questions), and targetAudience.",
    "- Titles should be magnetic and click-earning — never corporate or fluffy.",
    "- talkingPoints are prompts HE will answer later in quick fragments (e.g. \"How did the weight feel?\", \"What's the #1 tip you'd give someone trying this?\").",
    "- Do not invent PRs, weights, or events that are not in his notes.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      summary:
        "string — 1 sentence on how his notes line up with current fitness search demand",
      options: [
        {
          title: "string",
          talkingPoints: ["string", "string", "string"],
          targetAudience: "string",
        },
      ],
    }),
    "",
    `HUNTER'S RAW DAILY NOTES:\n${input.notes.slice(0, 4000)}`,
    "",
    trendBlock,
  ].join("\n");
}

async function handleFinalizePost(input: {
  apiKey: string;
  title: string;
  notes: string;
  targetAudience: string;
  details: string;
  talkingPoints: string[];
}) {
  const model = getGeminiModel();
  const fingerprint = getArchiveFingerprint();
  const prompt = buildFinalizePrompt(input, fingerprint);

  try {
    const ai = createGeminiClient(input.apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const raw = (response.text ?? "").trim();
    if (!raw) {
      return jsonError("Gemini returned an empty article draft.", 502, {
        provider: "gemini",
        model,
        action: "finalize_post",
      });
    }

    const article = parseFinalizedPost(raw, input.title);
    if (!article.bodyMarkdown.trim()) {
      return jsonError("Gemini returned an incomplete article. Try again.", 502, {
        provider: "gemini",
        model,
        action: "finalize_post",
        raw: raw.slice(0, 1500),
      });
    }

    return NextResponse.json({
      ok: true,
      action: "finalize_post" as const,
      provider: "gemini",
      model,
      fingerprint: {
        summary: fingerprintSummary(fingerprint),
        avgWordCount: fingerprint.avgWordCount,
        avgH2: fingerprint.avgH2,
        avgH3: fingerprint.avgH3,
        targetWordCountMin: fingerprint.targetWordCountMin,
        targetWordCountMax: fingerprint.targetWordCountMax,
      },
      article,
    });
  } catch (error) {
    return geminiErrorResponse(error, model, "finalize_post");
  }
}

function buildFinalizePrompt(
  input: {
    title: string;
    notes: string;
    targetAudience: string;
    details: string;
    talkingPoints: string[];
  },
  fingerprint: ReturnType<typeof getArchiveFingerprint>,
): string {
  return [
    "You are a world-class fitness editor for Vitality Sweat / Sweatlife Chronicles.",
    "Hunter is a 17-year-old athlete logging from the gym. He gave a selected title, messy raw notes, and bulleted fragment details — NOT full paragraphs.",
    "Weave his conversational, real-life gym experiences into a highly engaging, publish-ready markdown blog post.",
    "Ensure absolute grammatical perfection. Expand fragments into full sentences. Do NOT invent PRs, weights, or numbers he did not provide.",
    "",
    "MATCH OUR HISTORICAL H2/H3 FINGERPRINT (calorie-deficit archive baseline):",
    fingerprintSummary(fingerprint),
    "",
    "STRUCTURE / CADENCE RULES:",
    ...fingerprint.cadenceNotes.map((n) => `- ${n}`),
    `- Target word count: ${fingerprint.targetWordCountMin}–${fingerprint.targetWordCountMax}.`,
    `- Typical paragraph length ≈ ${fingerprint.avgParagraphChars} characters.`,
    `- Aim for ~${fingerprint.avgH2} ## H2 sections and ~${fingerprint.avgH3} ### H3 subsections.`,
    "- Use markdown only: paragraphs, ## H2, ### H3, and - bullet lists. No HTML. No images in bodyMarkdown.",
    "",
    "TONE RULES:",
    ...fingerprint.toneNotes.map((n) => `- ${n}`),
    "",
    "Example H2 phrasing from archive:",
    ...fingerprint.exampleH2s.slice(0, 5).map((h) => `- ${h}`),
    "Example H3 phrasing from archive:",
    ...fingerprint.exampleH3s.slice(0, 6).map((h) => `- ${h}`),
    "",
    "Also return an explicit imagePrompt object for a later Gemini Image API call.",
    "The image must be TEXT-FREE (no letters, logos, watermarks, captions). 16:9 editorial background.",
    `Brand color cues: charcoal ${BRAND_VISUAL_TOKENS.ink}, orange accent ${BRAND_VISUAL_TOKENS.orange}, warm surface ${BRAND_VISUAL_TOKENS.surface}. Guide: ${BRAND_GUIDE_URL}`,
    "",
    "SEO METADATA (required — Hunter never fills tags on his phone):",
    "Generate seoMetadata from the FINAL article so the post is fully search-optimized on publish.",
    "- metaTitle: highly clickable, SEO-optimized title under 60 characters; weave in primary fitness/nutrition keywords; no clickbait spam.",
    "- metaDescription: compelling Google SERP summary between 140 and 160 characters that maximizes CTR; include a benefit or hook.",
    "- slug: clean URL-friendly kebab-case string from the topic (e.g. incline-bench-press-tips-chest-growth); lowercase letters, numbers, hyphens only; no stop-word stuffing.",
    "- keywords: array of 5–8 highly relevant search terms and tags grounded in the post content.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      title: "string — editorial headline for the article page",
      excerpt: "string — short card teaser",
      bodyMarkdown:
        "string — full article markdown with ## / ### / paragraphs / lists",
      seoMetadata: {
        metaTitle: "string — ≤60 chars, keyword-rich SERP title",
        metaDescription:
          "string — 140–160 chars, CTR-focused Google snippet",
        slug: "string — kebab-case url slug",
        keywords: ["string", "string", "string", "string", "string"],
      },
      imagePrompt: {
        subject: "string — 8–16 words, scene subject only",
        lighting: "string",
        composition: "string — 16:9 framing notes",
        style: "string — brand color / photography look",
        negativeConstraints:
          "string — no text, logos, watermarks, UI, stickers, purple neon",
        prompt:
          "string — complete ready-to-send image generation prompt combining the above",
      },
    }),
    "",
    `SELECTED TITLE:\n${input.title}`,
    input.targetAudience
      ? `TARGET AUDIENCE:\n${input.targetAudience}`
      : null,
    input.talkingPoints.length
      ? `TALKING POINTS HE ANSWERED:\n${input.talkingPoints.map((t) => `- ${t}`).join("\n")}`
      : null,
    `HUNTER'S RAW NOTES:\n${input.notes.slice(0, 4000) || "(none)"}`,
    `HUNTER'S BULLETED DETAILS:\n${input.details.slice(0, 4000) || "(none — lean on the raw notes)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseIdeaOptions(raw: string): {
  summary: string;
  options: BlogIdeaOption[];
} {
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as {
      summary?: unknown;
      options?: unknown;
      suggestions?: unknown;
    };
    const list = Array.isArray(parsed.options)
      ? parsed.options
      : Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];

    const options: BlogIdeaOption[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const title =
        (typeof row.title === "string" && row.title.trim()) ||
        (typeof row.headline === "string" && row.headline.trim()) ||
        "";
      if (!title) continue;

      const talkingPoints = asStringArray(
        row.talkingPoints ?? row.detailPrompts ?? row.thingsToCover,
      ).slice(0, 3);

      while (talkingPoints.length < 3) {
        talkingPoints.push(
          [
            "How did this feel in the moment?",
            "What's the #1 tip you'd give someone trying this?",
            "Any numbers or details worth sharing?",
          ][talkingPoints.length]!,
        );
      }

      options.push({
        title,
        talkingPoints,
        targetAudience:
          typeof row.targetAudience === "string"
            ? row.targetAudience.trim()
            : "",
      });
      if (options.length === 3) break;
    }

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      options,
    };
  } catch {
    return { summary: "", options: [] };
  }
}

function parseFinalizedPost(
  raw: string,
  fallbackTitle: string,
): FinalizedPostResult {
  const cleaned = stripFences(raw);
  const fallbackImage = defaultImagePrompt(fallbackTitle);

  try {
    const parsed = JSON.parse(cleaned) as Partial<FinalizedPostResult> & {
      visualSubject?: string;
      description?: string;
      keywords?: unknown;
    };

    const title =
      (typeof parsed.title === "string" && parsed.title.trim()) ||
      fallbackTitle;
    const bodyMarkdown =
      typeof parsed.bodyMarkdown === "string" ? parsed.bodyMarkdown.trim() : "";
    const excerpt =
      (typeof parsed.excerpt === "string" && parsed.excerpt.trim()) ||
      bodyMarkdown.slice(0, 160);

    const seoMetadata = normalizeSeoMetadata(parsed.seoMetadata, {
      title,
      excerpt,
      description:
        typeof parsed.description === "string"
          ? parsed.description.trim()
          : "",
      keywords: asStringArray(parsed.keywords),
    });

    return {
      title,
      excerpt,
      // Keep top-level fields aligned with SEO for older clients / UI chips.
      description: seoMetadata.metaDescription,
      keywords: seoMetadata.keywords,
      bodyMarkdown,
      seoMetadata,
      imagePrompt: normalizeImagePrompt(
        parsed.imagePrompt,
        title,
        typeof parsed.visualSubject === "string"
          ? parsed.visualSubject
          : undefined,
      ),
    };
  } catch {
    const seoMetadata = normalizeSeoMetadata(null, {
      title: fallbackTitle,
      excerpt: "",
      description: "",
      keywords: [],
    });
    return {
      title: fallbackTitle,
      excerpt: "",
      description: seoMetadata.metaDescription,
      keywords: seoMetadata.keywords,
      bodyMarkdown: "",
      seoMetadata,
      imagePrompt: fallbackImage,
    };
  }
}

/**
 * Coerce / repair Gemini SEO output so publish always has usable fields.
 * metaTitle ≤60, metaDescription clamped toward 140–160, slug kebab-cased.
 */
function normalizeSeoMetadata(
  value: unknown,
  fallback: {
    title: string;
    excerpt: string;
    description: string;
    keywords: string[];
  },
): BlogSeoMetadata {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  let metaTitle =
    (typeof row.metaTitle === "string" && row.metaTitle.trim()) ||
    fallback.title ||
    "Sweatlife Chronicles";
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.slice(0, 57).replace(/\s+\S*$/, "").trimEnd() + "…";
  }

  let metaDescription =
    (typeof row.metaDescription === "string" && row.metaDescription.trim()) ||
    fallback.description ||
    fallback.excerpt ||
    metaTitle;
  if (metaDescription.length > 160) {
    metaDescription =
      metaDescription.slice(0, 157).replace(/\s+\S*$/, "").trimEnd() + "…";
  }
  if (metaDescription.length < 140 && fallback.excerpt) {
    const padded = `${metaDescription} ${fallback.excerpt}`.trim();
    metaDescription =
      padded.length <= 160
        ? padded
        : padded.slice(0, 157).replace(/\s+\S*$/, "").trimEnd() + "…";
  }

  const rawSlug =
    (typeof row.slug === "string" && row.slug.trim()) ||
    slugifyTitle(fallback.title || metaTitle);
  const slug = slugifyTitle(rawSlug.replace(/_/g, "-"));

  let keywords = asStringArray(row.keywords);
  if (keywords.length < 5) {
    const extras = [
      ...fallback.keywords,
      "Sweatlife Chronicles",
      "Vitality Sweat",
      "Hunter Broussard",
      "fitness",
      "nutrition",
      "training",
    ];
    for (const extra of extras) {
      if (keywords.length >= 5) break;
      if (!keywords.some((k) => k.toLowerCase() === extra.toLowerCase())) {
        keywords.push(extra);
      }
    }
  }
  keywords = keywords.slice(0, 8);

  return { metaTitle, metaDescription, slug, keywords };
}

function normalizeImagePrompt(
  value: unknown,
  title: string,
  visualSubject?: string,
): BlogImagePrompt {
  const fallback = defaultImagePrompt(title, visualSubject);
  if (!value || typeof value !== "object") return fallback;
  const row = value as Record<string, unknown>;

  const subject =
    (typeof row.subject === "string" && row.subject.trim()) ||
    fallback.subject;
  const lighting =
    (typeof row.lighting === "string" && row.lighting.trim()) ||
    fallback.lighting;
  const composition =
    (typeof row.composition === "string" && row.composition.trim()) ||
    fallback.composition;
  const style =
    (typeof row.style === "string" && row.style.trim()) || fallback.style;
  const negativeConstraints =
    (typeof row.negativeConstraints === "string" &&
      row.negativeConstraints.trim()) ||
    fallback.negativeConstraints;
  const prompt =
    (typeof row.prompt === "string" && row.prompt.trim()) ||
    [
      "Generate ONE text-free editorial background photograph for Sweatlife Chronicles.",
      `Subject: ${subject}`,
      `Lighting: ${lighting}`,
      `Composition: ${composition}`,
      `Style: ${style}`,
      `Avoid: ${negativeConstraints}`,
    ].join("\n");

  return {
    subject,
    lighting,
    composition,
    style,
    negativeConstraints,
    prompt,
  };
}

function defaultImagePrompt(
  title: string,
  visualSubject?: string,
): BlogImagePrompt {
  const subject =
    visualSubject?.trim() ||
    `Athletic training scene inspired by: ${title}`.slice(0, 120);
  const lighting =
    "Natural gym / outdoor training light with warm highlights and soft shadows";
  const composition =
    "Single clear subject, generous breathing room, edge-to-edge cinematic 16:9 crop";
  const style = `Realistic editorial photography; charcoal ${BRAND_VISUAL_TOKENS.ink} and warm ${BRAND_VISUAL_TOKENS.surface} tones with restrained orange ${BRAND_VISUAL_TOKENS.orange} accent energy — never purple neon`;
  const negativeConstraints =
    "Absolutely no text, letters, numbers, logos, watermarks, captions, posters, UI chrome, stickers, badges, or floating labels";

  return {
    subject,
    lighting,
    composition,
    style,
    negativeConstraints,
    prompt: [
      "Generate ONE text-free editorial background photograph for a Sweatlife Chronicles blog hero.",
      negativeConstraints + ".",
      `Subject: ${subject}`,
      `Lighting: ${lighting}`,
      `Composition: ${composition}`,
      `Style: ${style}`,
      `Brand guide: ${BRAND_GUIDE_URL}`,
      `Article context title (do not render as text): ${title}`,
    ].join("\n"),
  };
}

function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

function geminiErrorResponse(
  error: unknown,
  model: string,
  action: BlogAssistAction,
) {
  const message =
    error instanceof Error ? error.message : "Gemini request failed.";
  const connection = isLikelyConnectionError(error);

  return NextResponse.json(
    {
      ok: false,
      provider: "gemini",
      model,
      action,
      error: connection
        ? "Gemini connection dropped or timed out. Retry in a moment."
        : message,
      connectionError: connection,
    },
    { status: connection ? 504 : 502 },
  );
}
