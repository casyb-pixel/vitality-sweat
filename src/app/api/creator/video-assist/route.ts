import { NextResponse } from "next/server";
import {
  createGeminiClient,
  formatGeminiError,
  getGeminiApiKey,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import { getCreatorRole } from "@/lib/auth/creator";
import type {
  ShortFormVideoIdea,
  VideoSocialPackage,
} from "@/lib/video/video-studio";
import { createClient } from "@/utils/supabase/server";
import { NO_EM_DASH_RULE, stripEmDashes } from "@/lib/text/humanize-copy";

export const runtime = "edge";
export const maxDuration = 60;

type VideoAssistAction =
  | "generate_video_ideas"
  | "regenerate_video_idea"
  | "generate_social_package";

type VideoAssistBody = {
  action?: VideoAssistAction;
  /** Full blog markdown / text for idea generation. */
  bodyMarkdown?: string;
  blogMarkdown?: string;
  blogTitle?: string;
  post?: {
    title?: string;
    excerpt?: string;
    keywords?: string[];
    bodyPreview?: string;
    bodyMarkdown?: string;
    slug?: string;
  };
  /** Selected concept for the social package. */
  concept?: {
    title?: string;
    videoHook?: string;
    shootingConcept?: string;
  };
  idea?: {
    title?: string;
    videoHook?: string;
    hook?: string;
    shootingConcept?: string;
  };
  /** Existing locked ideas — used when regenerating one slot. */
  existingIdeas?: ShortFormVideoIdea[];
  /** Index (0–4) of the idea to replace. */
  replaceIndex?: number;
  /** Confirmation that gym clip and/or voice-over were attached. */
  assetsReady?: boolean;
  hasVideo?: boolean;
  hasVoiceOver?: boolean;
};

/**
 * Video Studio AI (Edge):
 * - generate_video_ideas → 5 TikTok/Reels/Shorts concepts from blog markdown
 * - generate_social_package → caption, hashtags, thumbnail overlay, SEO metadata
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

    let body: VideoAssistBody;
    try {
      body = (await request.json()) as VideoAssistBody;
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    const action = resolveAction(body.action);
    if (!action) {
      return jsonError(
        'Send action: "generate_video_ideas", "regenerate_video_idea", or "generate_social_package".',
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

    if (action === "generate_video_ideas") {
      const markdown = resolveBlogMarkdown(body);
      const blogTitle =
        (body.blogTitle ?? body.post?.title ?? "").trim() || "Sweatlife Chronicle";
      if (!markdown) {
        return jsonError(
          "Provide the published blog markdown in `bodyMarkdown` (or post.bodyMarkdown).",
          400,
        );
      }
      return handleGenerateVideoIdeas({ apiKey, blogTitle, markdown });
    }

    if (action === "regenerate_video_idea") {
      const markdown = resolveBlogMarkdown(body);
      const blogTitle =
        (body.blogTitle ?? body.post?.title ?? "").trim() || "Sweatlife Chronicle";
      const replaceIndex = Number(body.replaceIndex);
      if (!markdown) {
        return jsonError(
          "Provide the published blog markdown in `bodyMarkdown` (or post.bodyMarkdown).",
          400,
        );
      }
      if (!Number.isInteger(replaceIndex) || replaceIndex < 0 || replaceIndex > 4) {
        return jsonError("Provide replaceIndex between 0 and 4.", 400);
      }
      const existing = Array.isArray(body.existingIdeas)
        ? body.existingIdeas
        : [];
      return handleRegenerateVideoIdea({
        apiKey,
        blogTitle,
        markdown,
        replaceIndex,
        existingIdeas: existing,
      });
    }

    const conceptTitle = (
      body.concept?.title ??
      body.idea?.title ??
      ""
    ).trim();
    const blogTitle = (body.blogTitle ?? body.post?.title ?? "").trim();
    if (!conceptTitle) {
      return jsonError("Provide the selected video concept `title`.", 400);
    }
    if (!blogTitle) {
      return jsonError("Provide the blog `title` / `blogTitle`.", 400);
    }

    return handleGenerateSocialPackage({
      apiKey,
      blogTitle,
      concept: {
        title: conceptTitle,
        videoHook: (
          body.concept?.videoHook ??
          body.idea?.videoHook ??
          body.idea?.hook ??
          ""
        ).trim(),
        shootingConcept: (
          body.concept?.shootingConcept ??
          body.idea?.shootingConcept ??
          ""
        ).trim(),
      },
      assetsReady: Boolean(
        body.assetsReady || body.hasVideo || body.hasVoiceOver,
      ),
      hasVideo: Boolean(body.hasVideo),
      hasVoiceOver: Boolean(body.hasVoiceOver),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return jsonError(message, 500);
  }
}

function resolveAction(
  action: string | undefined,
): VideoAssistAction | null {
  if (action === "generate_video_ideas") return action;
  if (action === "regenerate_video_idea") return action;
  if (action === "generate_social_package") return action;
  // Transitional alias from earlier wizard scaffold.
  if (action === "generate_production_pack") return "generate_social_package";
  return null;
}

function resolveBlogMarkdown(body: VideoAssistBody): string {
  return (
    body.bodyMarkdown?.trim() ||
    body.blogMarkdown?.trim() ||
    body.post?.bodyMarkdown?.trim() ||
    body.post?.bodyPreview?.trim() ||
    ""
  );
}

async function handleGenerateVideoIdeas(input: {
  apiKey: string;
  blogTitle: string;
  markdown: string;
}) {
  const model = getGeminiModel();
  const prompt = [
    "You are the Vitality Sweat AI Director for short-form social video.",
    "Hunter is a 17-year-old athlete filming on his phone at the gym.",
    "Read the full published blog post below and generate EXACTLY 5 DISTINCT short-form video concepts.",
    "Optimize each concept for algorithmic engagement on TikTok, Instagram Reels, and YouTube Shorts.",
    "Prioritize pattern interrupts, curiosity gaps, and gym-native visuals he can capture in under 45 seconds.",
    "Voice: direct, sweaty, encouraging — never corporate.",
    "Do not invent facts that contradict the article.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      ideas: [
        {
          title: "string — punchy short-form video title",
          videoHook: "string — exactly 1 sentence hook for the first 1–2 seconds",
          shootingConcept:
            "string — brief note of what Hunter should visually capture in the gym",
        },
      ],
    }),
    "",
    `BLOG TITLE:\n${input.blogTitle}`,
    "",
    `FULL BLOG MARKDOWN:\n${input.markdown.slice(0, 12000)}`,
  ].join("\n");

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
        action: "generate_video_ideas",
      });
    }

    const ideas = parseVideoIdeas(raw);
    if (ideas.length < 1) {
      return jsonError("Gemini did not return usable video ideas.", 502, {
        provider: "gemini",
        model,
        action: "generate_video_ideas",
        raw: raw.slice(0, 1500),
      });
    }

    return NextResponse.json({
      ok: true,
      action: "generate_video_ideas" as const,
      provider: "gemini",
      model,
      ideas: ideas.slice(0, 5),
    });
  } catch (error) {
    return geminiError(error, model, "generate_video_ideas");
  }
}

async function handleRegenerateVideoIdea(input: {
  apiKey: string;
  blogTitle: string;
  markdown: string;
  replaceIndex: number;
  existingIdeas: ShortFormVideoIdea[];
}) {
  const model = getGeminiModel();
  const avoid = input.existingIdeas
    .map((idea, i) =>
      i === input.replaceIndex
        ? null
        : `- ${idea.title}: ${idea.videoHook || idea.shootingConcept || ""}`,
    )
    .filter(Boolean)
    .join("\n");

  const rejected = input.existingIdeas[input.replaceIndex];
  const prompt = [
    "You are the Vitality Sweat AI Director for short-form social video.",
    "Hunter rejected ONE idea from a locked set of five. Generate exactly ONE replacement concept.",
    "It must be distinct from the other kept ideas and different from the rejected one.",
    "Optimize for TikTok / Reels / YouTube Shorts. Gym-native, under 45 seconds.",
    "Voice: direct, sweaty, encouraging — never corporate.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      idea: {
        title: "string — punchy short-form video title",
        videoHook: "string — exactly 1 sentence hook for the first 1–2 seconds",
        shootingConcept:
          "string — brief note of what Hunter should visually capture in the gym",
      },
    }),
    "",
    `BLOG TITLE:\n${input.blogTitle}`,
    "",
    rejected
      ? `REJECTED IDEA (do not repeat):\n${rejected.title} — ${rejected.videoHook} — ${rejected.shootingConcept}`
      : null,
    avoid ? `KEEP THESE (do not duplicate):\n${avoid}` : null,
    "",
    `FULL BLOG MARKDOWN:\n${input.markdown.slice(0, 12000)}`,
  ]
    .filter(Boolean)
    .join("\n");

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
        action: "regenerate_video_idea",
      });
    }

    const idea = parseSingleVideoIdea(raw);
    if (!idea) {
      return jsonError("Gemini did not return a usable replacement idea.", 502, {
        provider: "gemini",
        model,
        action: "regenerate_video_idea",
        raw: raw.slice(0, 1500),
      });
    }

    return NextResponse.json({
      ok: true,
      action: "regenerate_video_idea" as const,
      provider: "gemini",
      model,
      idea,
      replaceIndex: input.replaceIndex,
    });
  } catch (error) {
    return geminiError(error, model, "regenerate_video_idea");
  }
}

async function handleGenerateSocialPackage(input: {
  apiKey: string;
  blogTitle: string;
  concept: {
    title: string;
    videoHook: string;
    shootingConcept: string;
  };
  assetsReady: boolean;
  hasVideo: boolean;
  hasVoiceOver: boolean;
}) {
  const model = getGeminiModel();
  const assetLine = input.assetsReady
    ? `Assets confirmed — video clip: ${input.hasVideo ? "yes" : "no"}, voice-over: ${input.hasVoiceOver ? "yes" : "no"}.`
    : "Assets pending — still write the full package as if he will post with gym footage + VO.";

  const prompt = [
    "You are an expert social media growth manager for Vitality Sweat / Sweatlife Chronicles.",
    "Write a short-form video distribution package optimized for TikTok, Instagram Reels, and YouTube Shorts algorithms.",
    "Brand voice: direct, sweaty, encouraging. Never corporate or fluffy.",
    NO_EM_DASH_RULE,
    "",
    "Requirements:",
    "- caption: engaging, hook-first, line-broken, ready to paste; end with a soft CTA to create a FREE Vitality Engine account (workouts + meal plans)",
    "- Include a light Southwest Louisiana / Acadiana / SWLA angle when natural",
    "- hashtags: 5 to 8 hyper-targeted tags (include #VitalitySweat and #Sweatlife)",
    "- thumbnailTitle: short text overlay suggestion (max 6 words) for the first frame / thumbnail",
    "- seoMetadata: platform keyword tags plus a 1-2 sentence SEO description that mentions free signup",
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      caption: "string",
      hashtags: ["#VitalitySweat", "#Sweatlife"],
      thumbnailTitle: "string",
      seoMetadata: {
        tiktok: ["string"],
        youtubeShorts: ["string"],
        instagramReels: ["string"],
        description: "string - 1 to 2 sentence distribution SEO blurb",
      },
    }),
    "",
    `BLOG TITLE:\n${input.blogTitle}`,
    `SELECTED VIDEO CONCEPT:\n${input.concept.title}`,
    input.concept.videoHook
      ? `VIDEO HOOK:\n${input.concept.videoHook}`
      : null,
    input.concept.shootingConcept
      ? `SHOOTING CONCEPT:\n${input.concept.shootingConcept}`
      : null,
    `ASSET STATUS:\n${assetLine}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const ai = createGeminiClient(input.apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const raw = (response.text ?? "").trim();
    if (!raw) {
      return jsonError("Gemini returned an empty social package.", 502, {
        provider: "gemini",
        model,
        action: "generate_social_package",
      });
    }

    const socialPackage = parseSocialPackage(raw);
    if (!socialPackage.caption.trim()) {
      return jsonError("Gemini returned an incomplete social package.", 502, {
        provider: "gemini",
        model,
        action: "generate_social_package",
        raw: raw.slice(0, 1500),
      });
    }

    return NextResponse.json({
      ok: true,
      action: "generate_social_package" as const,
      provider: "gemini",
      model,
      package: socialPackage,
      // Alias for older UI naming.
      pack: socialPackage,
    });
  } catch (error) {
    return geminiError(error, model, "generate_social_package");
  }
}

function parseVideoIdeas(raw: string): ShortFormVideoIdea[] {
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as { ideas?: unknown } | unknown[];
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { ideas?: unknown }).ideas)
        ? ((parsed as { ideas: unknown[] }).ideas)
        : [];

    const ideas: ShortFormVideoIdea[] = [];
    for (const item of list) {
      const idea = coerceIdea(item);
      if (!idea) continue;
      ideas.push(idea);
      if (ideas.length === 5) break;
    }
    return ideas;
  } catch {
    return [];
  }
}

function parseSingleVideoIdea(raw: string): ShortFormVideoIdea | null {
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as {
      idea?: unknown;
      ideas?: unknown[];
    };
    if (parsed.idea) return coerceIdea(parsed.idea);
    if (Array.isArray(parsed.ideas) && parsed.ideas[0]) {
      return coerceIdea(parsed.ideas[0]);
    }
    return coerceIdea(parsed);
  } catch {
    return null;
  }
}

function coerceIdea(item: unknown): ShortFormVideoIdea | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return null;

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

  return { title, videoHook, shootingConcept };
}

function parseSocialPackage(raw: string): VideoSocialPackage {
  const cleaned = stripFences(raw);
  const fallback: VideoSocialPackage = {
    caption: "",
    hashtags: ["#VitalitySweat", "#Sweatlife"],
    thumbnailTitle: "",
    seoMetadata: {
      tiktok: [],
      youtubeShorts: [],
      instagramReels: [],
      description: "",
    },
  };

  try {
    const parsed = JSON.parse(cleaned) as Partial<VideoSocialPackage> & {
      seoMetadata?: Partial<VideoSocialPackage["seoMetadata"]>;
      platformTags?: Partial<VideoSocialPackage["seoMetadata"]>;
      thumbnailTitle?: string;
      onScreenText?: unknown;
    };

    const hashtags = asStringArray(parsed.hashtags)
      .map((t) => (t.startsWith("#") ? t : `#${t.replace(/\s+/g, "")}`))
      .slice(0, 8);

    const seo = parsed.seoMetadata ?? parsed.platformTags ?? {};

    return {
      caption: stripEmDashes(
        typeof parsed.caption === "string" ? parsed.caption.trim() : "",
      ),
      hashtags: hashtags.length
        ? hashtags
        : ["#VitalitySweat", "#Sweatlife", "#Fitness"],
      thumbnailTitle: stripEmDashes(
        (typeof parsed.thumbnailTitle === "string" &&
          parsed.thumbnailTitle.trim()) ||
          asStringArray(parsed.onScreenText)[0] ||
          "",
      ),
      seoMetadata: {
        tiktok: asStringArray(seo.tiktok).slice(0, 8),
        youtubeShorts: asStringArray(seo.youtubeShorts).slice(0, 8),
        instagramReels: asStringArray(seo.instagramReels).slice(0, 8),
        description: stripEmDashes(
          typeof seo.description === "string" ? seo.description.trim() : "",
        ),
      },
    };
  } catch {
    return fallback;
  }
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
    .filter(Boolean);
}

function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

function geminiError(
  error: unknown,
  model: string,
  action: VideoAssistAction,
) {
  const message = formatGeminiError(error);
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
