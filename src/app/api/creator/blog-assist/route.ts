import { FinishReason, Modality } from "@google/genai";
import { NextResponse } from "next/server";
import { buildBrandVisualAidPrompt } from "@/lib/ai/brand-visual";
import {
  createGeminiClient,
  getGeminiApiKey,
  getGeminiImageModel,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import { getCreatorRole } from "@/lib/auth/creator";
import {
  fingerprintSummary,
  getArchiveFingerprint,
} from "@/lib/blog/archive-fingerprint";
import type {
  BlogAssistMode,
  BlogAssistSuggestion,
  StructuredArticleResult,
} from "@/lib/blog/blog-assist";
import {
  blocksToMarkdown,
  injectLeadingImage,
  markdownToBlocks,
} from "@/lib/blog/markdown-blocks";
import {
  buildArchiveStructurePrompt,
  buildTextFreeBackgroundPrompt,
  type StructuredArticleDraft,
} from "@/lib/blog/structure-editor";
import { uploadBlogVisualAid } from "@/lib/storage/blog-images";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export type { BlogAssistMode, BlogAssistSuggestion, StructuredArticleResult };

type BlogAssistBody = {
  notes?: string;
  title?: string;
  excerpt?: string;
  bodyMarkdown?: string;
  mode?: BlogAssistMode;
};

type InlineImagePart = {
  data: string;
  mimeType: string;
};

type UserClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Creator Studio → Gemini blog architect.
 * - Text assists: headlines / transitions / reading flow
 * - structure: archive fingerprint rewrite + text-free cover background
 * - visual: ad-hoc brand visual aid
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized — creator privileges required." },
        { status: 401 },
      );
    }

    let body: BlogAssistBody;
    try {
      body = (await request.json()) as BlogAssistBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const notes = (body.notes ?? "").trim();
    const title = (body.title ?? "").trim();
    const excerpt = (body.excerpt ?? "").trim();
    const bodyMarkdown = (body.bodyMarkdown ?? "").trim();
    const mode: BlogAssistMode = body.mode ?? "full";

    if (!notes && !title && !excerpt && !bodyMarkdown) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Provide notes, title, excerpt, or bodyMarkdown for Gemini to work with.",
        },
        { status: 400 },
      );
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart Next.js.",
        },
        { status: 503 },
      );
    }

    if (mode === "structure") {
      return handleStructurePipeline({
        apiKey,
        title,
        excerpt,
        notes,
        bodyMarkdown,
        userClient: supabase,
      });
    }

    if (mode === "visual") {
      return handleVisualAid({
        apiKey,
        title,
        excerpt,
        notes,
        bodyMarkdown,
        userClient: supabase,
      });
    }

    const model = getGeminiModel();
    const prompt = buildBlogAssistPrompt({
      notes,
      title,
      excerpt,
      bodyMarkdown,
      mode,
    });

    try {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const raw = (response.text ?? "").trim();
      if (!raw) {
        return NextResponse.json(
          {
            ok: false,
            error: "Gemini returned an empty response.",
            provider: "gemini",
            model,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        provider: "gemini",
        model,
        mode,
        suggestion: parseSuggestion(raw),
        raw,
      });
    } catch (error) {
      return geminiErrorResponse(error, model);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function handleStructurePipeline(input: {
  apiKey: string;
  title: string;
  excerpt: string;
  notes: string;
  bodyMarkdown: string;
  userClient: UserClient;
}) {
  const fingerprint = getArchiveFingerprint();
  const textModel = getGeminiModel();
  const structurePrompt = buildArchiveStructurePrompt({
    ...input,
    fingerprint,
  });

  console.info(
    `[blog-assist:structure] Refining notes to archive fingerprint (${fingerprint.sampleSize} posts, ~${fingerprint.avgWordCount} words)`,
  );

  let draft: StructuredArticleDraft;
  try {
    const ai = createGeminiClient(input.apiKey);
    const response = await ai.models.generateContent({
      model: textModel,
      contents: structurePrompt,
    });
    const raw = (response.text ?? "").trim();
    if (!raw) {
      return NextResponse.json(
        {
          ok: false,
          error: "Structural editor returned an empty response.",
          provider: "gemini",
          model: textModel,
          mode: "structure" as const,
        },
        { status: 502 },
      );
    }
    draft = parseStructuredDraft(raw, input);
  } catch (error) {
    return geminiErrorResponse(error, textModel);
  }

  const imagePrompt = buildTextFreeBackgroundPrompt({
    title: draft.title,
    visualSubject: draft.visualSubject,
    excerpt: draft.excerpt,
  });

  console.info(
    "[blog-assist:structure] Programmatic text-free background prompt ready — calling image model.",
  );

  let article: StructuredArticleResult = {
    title: draft.title,
    excerpt: draft.excerpt,
    description: draft.description,
    keywords: draft.keywords,
    bodyMarkdown: draft.bodyMarkdown,
    visualSubject: draft.visualSubject,
    fingerprintSummary: fingerprintSummary(fingerprint),
  };

  try {
    const generated = await generateAndUploadImage({
      apiKey: input.apiKey,
      prompt: imagePrompt,
      title: draft.title,
      altHint: `${draft.title} — text-free Sweatlife Chronicles background`,
      userClient: input.userClient,
      logPrefix: "structure",
    });

    if (generated.ok) {
      const blocks = injectLeadingImage(markdownToBlocks(draft.bodyMarkdown), {
        src: generated.uploaded.publicUrl,
        alt: generated.uploaded.alt,
      });
      article = {
        ...article,
        bodyMarkdown: blocksToMarkdown(blocks),
        coverMarkdown: generated.uploaded.markdown,
        coverUrl: generated.uploaded.publicUrl,
      };
    } else {
      console.warn(
        "[blog-assist:structure] Cover image skipped:",
        generated.error,
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      model: textModel,
      imageModel: getGeminiImageModel(),
      mode: "structure" as const,
      fingerprint: {
        summary: fingerprintSummary(fingerprint),
        avgWordCount: fingerprint.avgWordCount,
        avgH2: fingerprint.avgH2,
        avgH3: fingerprint.avgH3,
        targetWordCountMin: fingerprint.targetWordCountMin,
        targetWordCountMax: fingerprint.targetWordCountMax,
      },
      article,
      suggestion: {
        headlines: [draft.title],
        sectionTransitions: [],
        readingFlowTips: fingerprint.cadenceNotes.slice(0, 4),
        improvedExcerpt: draft.excerpt,
        summary: `Refined to archive fingerprint (${fingerprint.sampleSize} posts).`,
      } satisfies BlogAssistSuggestion,
    });
  } catch (error) {
    return geminiErrorResponse(error, getGeminiImageModel());
  }
}

async function handleVisualAid(input: {
  apiKey: string;
  title: string;
  excerpt: string;
  notes: string;
  bodyMarkdown: string;
  userClient: UserClient;
}) {
  const model = getGeminiImageModel();
  const prompt = buildBrandVisualAidPrompt(input);

  console.info(
    `[blog-assist:visual] Starting image generation with model "${model}"`,
  );

  try {
    const generated = await generateAndUploadImage({
      apiKey: input.apiKey,
      prompt,
      title: input.title || "Vitality Sweat visual aid",
      altHint: input.title
        ? `${input.title} — Vitality Sweat visual aid`
        : "Vitality Sweat Sweatlife Chronicles visual aid",
      userClient: input.userClient,
      logPrefix: "visual",
    });

    if (!generated.ok) {
      return NextResponse.json(
        {
          ok: false,
          provider: "gemini",
          model,
          mode: "visual" as const,
          error: generated.error,
          finishReason: generated.finishReason ?? null,
          textNotes: generated.textNotes ?? null,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      model,
      mode: "visual" as const,
      finishReason: generated.finishReason ?? null,
      textNotes: generated.textNotes ?? null,
      visual: {
        markdown: generated.uploaded.markdown,
        publicUrl: generated.uploaded.publicUrl,
        path: generated.uploaded.path,
        alt: generated.uploaded.alt,
        mimeType: generated.uploaded.mimeType,
        model,
      },
      markdown: generated.uploaded.markdown,
    });
  } catch (error) {
    if (isStructureLimitError(error)) {
      console.error(
        "[blog-assist:visual] External API structure limit / payload error:",
        error instanceof Error ? error.message : error,
      );
    }
    return geminiErrorResponse(error, model);
  }
}

async function generateAndUploadImage(input: {
  apiKey: string;
  prompt: string;
  title: string;
  altHint: string;
  userClient: UserClient;
  logPrefix: string;
}): Promise<
  | {
      ok: true;
      uploaded: Awaited<ReturnType<typeof uploadBlogVisualAid>>;
      finishReason?: string;
      textNotes?: string;
    }
  | {
      ok: false;
      error: string;
      finishReason?: string;
      textNotes?: string;
    }
> {
  const model = getGeminiImageModel();
  const ai = createGeminiClient(input.apiKey);
  const stream = await ai.models.generateContentStream({
    model,
    contents: input.prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K",
      },
    },
  });

  const collected: InlineImagePart[] = [];
  let textNotes = "";
  let lastFinishReason: string | undefined;
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount += 1;
    const finishReason = chunk.candidates?.[0]?.finishReason;
    if (finishReason) lastFinishReason = String(finishReason);

    if (
      finishReason === FinishReason.MAX_TOKENS ||
      finishReason === FinishReason.RECITATION ||
      String(finishReason ?? "").includes("LENGTH")
    ) {
      console.warn(
        `[blog-assist:${input.logPrefix}] Structure / token limit signal on chunk ${chunkCount}: finishReason=${finishReason}`,
      );
    }

    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.text) textNotes += part.text;
      if (part.inlineData?.data) {
        collected.push({
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }

    if (!parts.some((p) => p.inlineData?.data) && chunk.data) {
      collected.push({ data: chunk.data, mimeType: "image/png" });
    }
  }

  console.info(
    `[blog-assist:${input.logPrefix}] Stream complete — chunks=${chunkCount}, images=${collected.length}, finishReason=${lastFinishReason ?? "n/a"}`,
  );

  if (lastFinishReason === FinishReason.MAX_TOKENS) {
    console.error(
      `[blog-assist:${input.logPrefix}] External API hit a structure/token limit (MAX_TOKENS). Image payload may be incomplete.`,
    );
  }

  if (!collected.length) {
    return {
      ok: false,
      error:
        lastFinishReason === FinishReason.MAX_TOKENS
          ? "Gemini hit a structure/token limit before returning image bytes. Try a shorter draft context."
          : "Gemini returned no image data. Retry or check GEMINI_IMAGE_MODEL access.",
      finishReason: lastFinishReason,
      textNotes: textNotes.trim() || undefined,
    };
  }

  const image = collected[collected.length - 1];
  const buffer = Buffer.from(image.data, "base64");
  if (!buffer.byteLength) {
    return { ok: false, error: "Decoded image buffer was empty." };
  }

  const serviceClient = createServiceRoleClient();
  const storageClient = serviceClient ?? input.userClient;
  if (!serviceClient) {
    console.warn(
      `[blog-assist:${input.logPrefix}] SUPABASE_SERVICE_ROLE_KEY missing — uploading with user session client.`,
    );
  }

  const uploaded = await uploadBlogVisualAid({
    supabase: storageClient,
    buffer,
    mimeType: image.mimeType,
    title: input.title,
    altHint: input.altHint,
  });

  return {
    ok: true,
    uploaded,
    finishReason: lastFinishReason,
    textNotes: textNotes.trim() || undefined,
  };
}

function parseStructuredDraft(
  raw: string,
  fallback: {
    title: string;
    excerpt: string;
    notes: string;
    bodyMarkdown: string;
  },
): StructuredArticleDraft {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<StructuredArticleDraft>;
    const title =
      (typeof parsed.title === "string" && parsed.title.trim()) ||
      fallback.title ||
      "Untitled Sweatlife Chronicle";
    const bodyMarkdown =
      (typeof parsed.bodyMarkdown === "string" && parsed.bodyMarkdown.trim()) ||
      fallback.bodyMarkdown ||
      fallback.notes;
    const excerpt =
      (typeof parsed.excerpt === "string" && parsed.excerpt.trim()) ||
      fallback.excerpt ||
      bodyMarkdown.slice(0, 160);

    return {
      title,
      excerpt,
      description:
        (typeof parsed.description === "string" && parsed.description.trim()) ||
        excerpt,
      keywords: asStringArray(parsed.keywords).length
        ? asStringArray(parsed.keywords)
        : ["Sweatlife Chronicles", "Vitality Sweat", "Hunter Broussard"],
      bodyMarkdown,
      visualSubject:
        (typeof parsed.visualSubject === "string" &&
          parsed.visualSubject.trim()) ||
        `Athletic training scene for ${title}`,
    };
  } catch {
    console.warn(
      "[blog-assist:structure] Failed to parse structural JSON — falling back to notes markdown.",
    );
    return {
      title: fallback.title || "Untitled Sweatlife Chronicle",
      excerpt: fallback.excerpt || fallback.notes.slice(0, 160),
      description: fallback.excerpt || fallback.notes.slice(0, 160),
      keywords: ["Sweatlife Chronicles", "Vitality Sweat"],
      bodyMarkdown: fallback.bodyMarkdown || fallback.notes,
      visualSubject: `Athletic editorial background for ${fallback.title || "Sweatlife Chronicles"}`,
    };
  }
}

function isStructureLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("max token") ||
    msg.includes("maximum") ||
    msg.includes("too large") ||
    msg.includes("payload") ||
    msg.includes("quota") ||
    msg.includes("resource exhausted") ||
    msg.includes("structure")
  );
}

function geminiErrorResponse(error: unknown, model: string) {
  const message =
    error instanceof Error ? error.message : "Gemini request failed.";
  const connection = isLikelyConnectionError(error);
  const structure = isStructureLimitError(error);

  if (structure) {
    console.error(
      `[blog-assist] Structure/limit error from Gemini (${model}):`,
      message,
    );
  }

  return NextResponse.json(
    {
      ok: false,
      provider: "gemini",
      model,
      error: connection
        ? "Gemini connection dropped or timed out. Retry in a moment."
        : structure
          ? `Gemini structure/limit error: ${message}`
          : message,
      connectionError: connection,
      structureLimit: structure,
    },
    { status: connection ? 504 : 502 },
  );
}

function buildBlogAssistPrompt(input: {
  notes: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  mode: BlogAssistMode;
}): string {
  const focus =
    input.mode === "headlines"
      ? "Prioritize SEO-ready headline options (5–7)."
      : input.mode === "transitions"
        ? "Prioritize clear section transition lines between ideas."
        : input.mode === "reading_flow"
          ? "Prioritize reading-flow improvements: order, pacing, and skim-friendly structure."
          : "Deliver a balanced full assist: headlines, transitions, and reading-flow tips.";

  return [
    "You are the Vitality Sweat AI Blog Architect for Sweatlife Chronicles.",
    "Brand voice: direct, sweaty, encouraging — never corporate or fluffy.",
    "Audience: athletes, parents of youth baseball players, and everyday fitness readers in Southwest Louisiana and beyond.",
    "Identity cues: charcoal (#404040) + orange (#ff6600); product name Vitality Sweat.",
    focus,
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      headlines: ["string"],
      sectionTransitions: ["string"],
      readingFlowTips: ["string"],
      improvedExcerpt: "string",
      summary: "string",
    }),
    input.title ? `Working title:\n${input.title}` : null,
    input.excerpt ? `Current excerpt:\n${input.excerpt}` : null,
    input.notes ? `Creator rough notes:\n${input.notes}` : null,
    input.bodyMarkdown ? `Draft body (markdown):\n${input.bodyMarkdown}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseSuggestion(raw: string): BlogAssistSuggestion {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<BlogAssistSuggestion>;
    return {
      headlines: asStringArray(parsed.headlines),
      sectionTransitions: asStringArray(parsed.sectionTransitions),
      readingFlowTips: asStringArray(parsed.readingFlowTips),
      improvedExcerpt:
        typeof parsed.improvedExcerpt === "string"
          ? parsed.improvedExcerpt.trim()
          : undefined,
      summary:
        typeof parsed.summary === "string" ? parsed.summary.trim() : undefined,
    };
  } catch {
    return {
      headlines: [],
      sectionTransitions: [],
      readingFlowTips: [cleaned.slice(0, 2000)],
      summary: "Gemini returned unstructured text — see readingFlowTips.",
    };
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}
