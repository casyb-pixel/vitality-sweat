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
import { normalizeVideoIdea } from "@/lib/video/normalize-idea";
import {
  pickStrengthExercisesNeedingVideo,
  type StrengthExerciseCandidate,
} from "@/lib/video/pick-exercises-for-howto";
import { createClient } from "@/utils/supabase/server";
import { GYM_BRO_SCRIPT_RULES, NO_EM_DASH_RULE, stripEmDashes } from "@/lib/text/humanize-copy";

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
    kind?: string;
    exerciseName?: string | null;
    formTips?: string[] | null;
    voiceoverScript?: string | null;
  };
  idea?: {
    title?: string;
    videoHook?: string;
    hook?: string;
    shootingConcept?: string;
    kind?: string;
    exerciseName?: string | null;
    formTips?: string[] | null;
    voiceoverScript?: string | null;
  };
  /** Existing locked ideas â€” used when regenerating one slot. */
  existingIdeas?: ShortFormVideoIdea[];
  /** Index (0â€“4) of the idea to replace. */
  replaceIndex?: number;
  /** Confirmation that gym clip and/or voice-over were attached. */
  assetsReady?: boolean;
  hasVideo?: boolean;
  hasVoiceOver?: boolean;
  /** Phase 1b â€” App invite script structure. */
  scriptPreset?: "standard" | "app_invite";
};

/**
 * Video Studio AI (Edge):
 * - generate_video_ideas â†’ 3 blog-related + 2 strength exercise how-to Shorts
 * - generate_social_package â†’ caption, hashtags, thumbnail overlay, SEO metadata
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return jsonError("Unauthorized â€” creator privileges required.", 401);
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
      return handleGenerateVideoIdeas({
        supabase,
        apiKey,
        blogTitle,
        markdown,
        scriptPreset:
          body.scriptPreset === "app_invite" ? "app_invite" : "standard",
      });
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
        supabase,
        apiKey,
        blogTitle,
        markdown,
        replaceIndex,
        existingIdeas: existing,
        scriptPreset:
          body.scriptPreset === "app_invite" ? "app_invite" : "standard",
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

    const conceptKind =
      body.concept?.kind === "exercise_howto" ||
      body.idea?.kind === "exercise_howto"
        ? "exercise_howto"
        : "blog";
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
        kind: conceptKind,
        exerciseName: (
          body.concept?.exerciseName ??
          body.idea?.exerciseName ??
          ""
        ).trim() || null,
        formTips: body.concept?.formTips ?? body.idea?.formTips ?? null,
        voiceoverScript: (
          body.concept?.voiceoverScript ??
          body.idea?.voiceoverScript ??
          ""
        ).trim() || null,
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
  supabase: Awaited<ReturnType<typeof createClient>>;
  apiKey: string;
  blogTitle: string;
  markdown: string;
  scriptPreset: "standard" | "app_invite";
}) {
  const model = getGeminiModel();
  const exercises = await pickStrengthExercisesNeedingVideo(input.supabase, {
    limit: 2,
  });

  if (exercises.length < 2) {
    return jsonError(
      "Need at least 2 active strength exercises without a YouTube how-to video. Add exercises or clear stale youtube_url values.",
      409,
    );
  }

  const appInvite =
    input.scriptPreset === "app_invite"
      ? [
          "SCRIPT PRESET: APP INVITE (required for the 3 blog ideas)",
          "Blog ideas must follow: hook (0â€“2s) â†’ one tip (middle) â†’ free Vitality Engine CTA (last 5s).",
          "Include scriptBeats { hook, tip, cta } on each blog idea.",
          "CTA must invite a free account for workouts + meal plans â€” SWLA / Acadiana framing.",
        ].join("\n")
      : "SCRIPT PRESET: standard short-form concepts for the 3 blog ideas.";

  const exerciseLines = exercises
    .map(
      (ex, i) =>
        `${i + 1}. id=${ex.id} | name=${ex.name} | muscle=${ex.primaryMuscle ?? "n/a"} | equipment=${ex.equipment ?? "n/a"}`,
    )
    .join("\n");

  const shape = {
    blogIdeas: [
      {
        kind: "blog",
        title: "string â€” punchy short-form video title tied to the blog",
        videoHook:
          "string â€” exactly 1 sentence hook for the first 1â€“2 seconds",
        shootingConcept:
          "string â€” brief note of what Hunter should visually capture in the gym",
        voiceoverScript:
          "string â€” 20â€“40 second spoken script Hunter can read for voice-over",
        ...(input.scriptPreset === "app_invite"
          ? {
              scriptBeats: {
                hook: "string â€” spoken/on-screen hook",
                tip: "string â€” one actionable tip",
                cta: "string â€” free Vitality Engine invite line",
              },
            }
          : {}),
      },
    ],
    exerciseHowTos: [
      {
        kind: "exercise_howto",
        exerciseId: "uuid â€” must match one of the provided exercise ids",
        exerciseName: "string â€” exact exercise name",
        title: "string â€” How to: Exercise Name (or punchy Shorts title)",
        videoHook: "string â€” 1 sentence hook for the first 1â€“2 seconds",
        shootingConcept:
          "string â€” camera angles / setup so form is clearly visible",
        formTips: [
          "string â€” concrete form cue Hunter must demonstrate correctly",
        ],
        voiceoverScript:
          "string - full voice-over script naming the exercise, walking through setup + reps, calling out form tips, ending with a soft Vitality Engine CTA",
        spokenLines: [
          "string - 8 to 14 words Hunter reads. No ad-lib blanks.",
        ],
        durationSec: 20,
        filmMode: "silent_vo",
        shotList: ["string - where to stand and where the camera looks"],
        coachNote: "string - one sentence for the parent coach",
      },
    ],
  };

  const prompt = [
    "You are the Vitality Sweat AI Director for short-form social video.",
    "Hunter is a 17-year-old athlete filming on his phone at the gym.",
    "Build ONE batch of EXACTLY 5 video concepts:",
    "- EXACTLY 3 blogIdeas related to the published blog post (TikTok / Reels / YouTube Shorts).",
    "- EXACTLY 2 exerciseHowTos for the strength exercises listed below (YouTube Shorts how-to demos).",
    "Optimize for algorithmic engagement. Gym-native visuals under 45 seconds.",
    "Voice: direct, sweaty, encouraging - never corporate.",
    NO_EM_DASH_RULE,
    GYM_BRO_SCRIPT_RULES,
    "Do not invent facts that contradict the article.",
    "For exercise how-tos: formTips must be specific coaching cues (brace, bar path, knee tracking, etc.).",
    "voiceoverScript must be readable aloud as continuous narration (not bullet points).",
    "spokenLines are the teleprompter. 4-6 short sentences. Last line is the Engine CTA.",
    "Default filmMode is silent_vo. Hunter films the lift with no talking, then reads the script at home.",
    "",
    appInvite,
    "",
    "STRENGTH EXERCISES NEEDING A HOW-TO VIDEO (use BOTH, one how-to each):",
    exerciseLines,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify(shape),
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

    const ideas = parseMixedVideoIdeas(raw, exercises);
    if (ideas.length < 5) {
      return jsonError("Gemini did not return a full 3+2 idea set.", 502, {
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
  supabase: Awaited<ReturnType<typeof createClient>>;
  apiKey: string;
  blogTitle: string;
  markdown: string;
  replaceIndex: number;
  existingIdeas: ShortFormVideoIdea[];
  scriptPreset: "standard" | "app_invite";
}) {
  const model = getGeminiModel();
  const rejected = input.existingIdeas[input.replaceIndex];
  const isExercise =
    rejected?.kind === "exercise_howto" || input.replaceIndex >= 3;

  if (isExercise) {
    const excludeIds = input.existingIdeas
      .map((idea) => idea.exerciseId)
      .filter((id): id is string => Boolean(id));
    const [nextExercise] = await pickStrengthExercisesNeedingVideo(
      input.supabase,
      { limit: 1, excludeIds },
    );
    if (!nextExercise) {
      return jsonError(
        "No other strength exercises without a how-to video are available.",
        409,
      );
    }
    return regenerateExerciseHowTo({
      apiKey: input.apiKey,
      model,
      blogTitle: input.blogTitle,
      exercise: nextExercise,
      replaceIndex: input.replaceIndex,
      rejected,
    });
  }

  const avoid = input.existingIdeas
    .map((idea, i) =>
      i === input.replaceIndex
        ? null
        : `- ${idea.title}: ${idea.videoHook || idea.shootingConcept || ""}`,
    )
    .filter(Boolean)
    .join("\n");

  const appInvite =
    input.scriptPreset === "app_invite"
      ? "Use APP INVITE structure: hook â†’ tip â†’ free Vitality Engine CTA. Include scriptBeats."
      : "";
  const prompt = [
    "You are the Vitality Sweat AI Director for short-form social video.",
    "Hunter rejected ONE blog-related idea from a locked set of five (3 blog + 2 exercise how-tos).",
    "Generate exactly ONE replacement BLOG concept (kind: blog).",
    "It must be distinct from the other kept ideas and different from the rejected one.",
    "Optimize for TikTok / Reels / YouTube Shorts. Gym-native, under 45 seconds.",
    "Voice: direct, sweaty, encouraging - never corporate.",
    NO_EM_DASH_RULE,
    GYM_BRO_SCRIPT_RULES,
    appInvite,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify(
      input.scriptPreset === "app_invite"
        ? {
            idea: {
              kind: "blog",
              title: "string â€” punchy short-form video title",
              videoHook:
                "string â€” exactly 1 sentence hook for the first 1â€“2 seconds",
              shootingConcept:
                "string â€” brief note of what Hunter should visually capture in the gym",
              voiceoverScript: "string â€” spoken voice-over script",
              scriptBeats: { hook: "string", tip: "string", cta: "string" },
            },
          }
        : {
            idea: {
              kind: "blog",
              title: "string â€” punchy short-form video title",
              videoHook:
                "string â€” exactly 1 sentence hook for the first 1â€“2 seconds",
              shootingConcept:
                "string â€” brief note of what Hunter should visually capture in the gym",
              voiceoverScript: "string â€” spoken voice-over script",
            },
          },
    ),
    "",
    `BLOG TITLE:\n${input.blogTitle}`,
    "",
    rejected
      ? `REJECTED IDEA (do not repeat):\n${rejected.title} - ${rejected.videoHook} - ${rejected.shootingConcept}`
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
      idea: { ...idea, kind: "blog" as const, exerciseId: null, exerciseName: null },
      replaceIndex: input.replaceIndex,
    });
  } catch (error) {
    return geminiError(error, model, "regenerate_video_idea");
  }
}

async function regenerateExerciseHowTo(input: {
  apiKey: string;
  model: string;
  blogTitle: string;
  exercise: StrengthExerciseCandidate;
  replaceIndex: number;
  rejected?: ShortFormVideoIdea;
}) {
  const prompt = [
    "You are the Vitality Sweat AI Director for YouTube Shorts exercise how-tos.",
    "Hunter films on his phone at the gym. Generate ONE exercise how-to concept.",
    "Include formTips Hunter must demonstrate correctly and a full voiceoverScript to read aloud.",
    "Include spokenLines (teleprompter), shotList, coachNote, filmMode silent_vo.",
    "Voice: direct, sweaty, encouraging - never corporate.",
    NO_EM_DASH_RULE,
    GYM_BRO_SCRIPT_RULES,
    "",
    "Return ONLY valid JSON (no markdown fences) with this exact shape:",
    JSON.stringify({
      idea: {
        kind: "exercise_howto",
        exerciseId: input.exercise.id,
        exerciseName: input.exercise.name,
        title: `How to: ${input.exercise.name}`,
        videoHook: "string - 1 sentence hook",
        shootingConcept: "string - camera / setup notes",
        formTips: ["string - form cue"],
        voiceoverScript: "string - full spoken script",
        spokenLines: ["string - 8 to 14 words"],
        durationSec: 20,
        filmMode: "silent_vo",
        shotList: ["string"],
        coachNote: "string",
      },
    }),
    "",
    `EXERCISE:\nid=${input.exercise.id}\nname=${input.exercise.name}\nmuscle=${input.exercise.primaryMuscle ?? "n/a"}\nequipment=${input.exercise.equipment ?? "n/a"}`,
    input.rejected
      ? `REJECTED (do not repeat):\n${input.rejected.title} - ${input.rejected.exerciseName ?? ""}`
      : null,
    `BLOG CONTEXT TITLE (for soft brand CTA only):\n${input.blogTitle}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const ai = createGeminiClient(input.apiKey);
    const response = await ai.models.generateContent({
      model: input.model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const raw = (response.text ?? "").trim();
    if (!raw) {
      return jsonError("Gemini returned an empty response.", 502, {
        provider: "gemini",
        model: input.model,
        action: "regenerate_video_idea",
      });
    }
    const parsed = parseSingleVideoIdea(raw);
    if (!parsed) {
      return jsonError("Gemini did not return a usable exercise how-to.", 502, {
        provider: "gemini",
        model: input.model,
        action: "regenerate_video_idea",
        raw: raw.slice(0, 1500),
      });
    }
    const idea = bindExerciseIdea(parsed, input.exercise);
    return NextResponse.json({
      ok: true,
      action: "regenerate_video_idea" as const,
      provider: "gemini",
      model: input.model,
      idea,
      replaceIndex: input.replaceIndex,
    });
  } catch (error) {
    return geminiError(error, input.model, "regenerate_video_idea");
  }
}

async function handleGenerateSocialPackage(input: {
  apiKey: string;
  blogTitle: string;
  concept: {
    title: string;
    videoHook: string;
    shootingConcept: string;
    kind: "blog" | "exercise_howto";
    exerciseName: string | null;
    formTips: string[] | null;
    voiceoverScript: string | null;
  };
  assetsReady: boolean;
  hasVideo: boolean;
  hasVoiceOver: boolean;
}) {
  const model = getGeminiModel();
  const assetLine = input.assetsReady
    ? `Assets confirmed â€” video clip: ${input.hasVideo ? "yes" : "no"}, voice-over: ${input.hasVoiceOver ? "yes" : "no"}.`
    : "Assets pending â€” still write the full package as if he will post with gym footage + VO.";

  const howToLine =
    input.concept.kind === "exercise_howto"
      ? [
          "This is an EXERCISE HOW-TO YouTube Short for the Vitality Sweat channel.",
          `Exercise: ${input.concept.exerciseName ?? input.concept.title}`,
          input.concept.formTips?.length
            ? `Form tips covered: ${input.concept.formTips.join("; ")}`
            : null,
          "Title/description should make the exercise searchable (How to + exercise name).",
          "End caption with a soft CTA to open Vitality Engine for free workouts + meal plans.",
        ]
          .filter(Boolean)
          .join("\n")
      : "This is a blog-related short promoting Sweatlife Chronicles + free Vitality Engine signup.";

  const prompt = [
    "You are an expert social media growth manager for Vitality Sweat / Sweatlife Chronicles.",
    "Write a short-form video distribution package optimized for TikTok, Instagram Reels, and YouTube Shorts algorithms.",
    "Brand voice: direct, sweaty, encouraging. Never corporate or fluffy.",
    NO_EM_DASH_RULE,
    "",
    howToLine,
    "",
    "Requirements:",
    "- caption: engaging, hook-first, line-broken, ready to paste; end with a soft CTA to create a FREE Vitality Engine account (workouts + meal plans)",
    "- Include a light Southwest Louisiana / Acadiana / SWLA angle when natural",
    "- hashtags: 5 to 8 hyper-targeted tags (include #VitalitySweat and #Sweatlife; for how-tos also include exercise/muscle tags)",
    "- thumbnailTitle: short text overlay suggestion (max 6 words) for the first frame / thumbnail",
    "- seoMetadata: platform keyword tags plus a 1-2 sentence SEO description that mentions free signup",
    "- For YouTube: description should include the exercise name (how-tos) and invite viewers to the free Vitality Engine app",
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
    input.concept.voiceoverScript
      ? `VOICEOVER SCRIPT:\n${input.concept.voiceoverScript}`
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

function parseMixedVideoIdeas(
  raw: string,
  exercises: StrengthExerciseCandidate[],
): ShortFormVideoIdea[] {
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as {
      ideas?: unknown[];
      blogIdeas?: unknown[];
      exerciseHowTos?: unknown[];
    };

    const blogRaw = Array.isArray(parsed.blogIdeas)
      ? parsed.blogIdeas
      : Array.isArray(parsed.ideas)
        ? parsed.ideas.filter(
            (item) =>
              !item ||
              typeof item !== "object" ||
              (item as { kind?: string }).kind !== "exercise_howto",
          )
        : [];
    const howtoRaw = Array.isArray(parsed.exerciseHowTos)
      ? parsed.exerciseHowTos
      : Array.isArray(parsed.ideas)
        ? parsed.ideas.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              (item as { kind?: string }).kind === "exercise_howto",
          )
        : [];

    const blogIdeas: ShortFormVideoIdea[] = [];
    for (const item of blogRaw) {
      const idea = coerceIdea(item);
      if (!idea) continue;
      blogIdeas.push({
        ...idea,
        kind: "blog",
        exerciseId: null,
        exerciseName: null,
      });
      if (blogIdeas.length === 3) break;
    }

    const howtoIdeas: ShortFormVideoIdea[] = [];
    for (let i = 0; i < exercises.length && howtoIdeas.length < 2; i++) {
      const exercise = exercises[i]!;
      const rawIdea = howtoRaw[i] ?? howtoRaw.find((item) => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        const id =
          typeof row.exerciseId === "string"
            ? row.exerciseId
            : typeof row.exercise_id === "string"
              ? row.exercise_id
              : "";
        const name =
          typeof row.exerciseName === "string"
            ? row.exerciseName
            : typeof row.exercise_name === "string"
              ? row.exercise_name
              : "";
        return id === exercise.id || name === exercise.name;
      });
      const parsedIdea = coerceIdea(rawIdea) ?? {
        title: `How to: ${exercise.name}`,
        videoHook: `Stop messing up your ${exercise.name}.`,
        shootingConcept: `Film ${exercise.name} from a 45Â° angle so form is clear.`,
        kind: "exercise_howto" as const,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        formTips: [
          "Set your base before every rep",
          "Control the eccentric - no bouncing",
          "Lock in a full range you can own",
        ],
        voiceoverScript: `This is how you do ${exercise.name} the right way. Set up tall, brace hard, and own every rep. Save this, then build your free Vitality Engine plan so you know exactly when this lift hits your week.`,
        spokenLines: [
          `This is a ${exercise.name} you can actually control.`,
          "Plant your base. Brace. Own the last inch.",
          "If it gets sloppy, cut the set. Log the honest reps.",
          "Log this in the free Vitality Engine so it shows up on the right day.",
        ],
        filmMode: "silent_vo",
        durationSec: 20,
        shotList: [
          "45 degree from the working side so the joint path is obvious",
          "No talking on the gym floor. VO at home.",
        ],
        coachNote: "Have him smile on the last line, then look at the bar.",
        scriptBeats: null,
      };
      howtoIdeas.push(bindExerciseIdea(parsedIdea, exercise));
    }

    return [...blogIdeas, ...howtoIdeas].slice(0, 5);
  } catch {
    return [];
  }
}

function bindExerciseIdea(
  idea: ShortFormVideoIdea,
  exercise: StrengthExerciseCandidate,
): ShortFormVideoIdea {
  const formTips =
    idea.formTips?.map((t) => t.trim()).filter(Boolean).slice(0, 6) ?? [];
  return {
    ...idea,
    kind: "exercise_howto",
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    title: idea.title.trim() || `How to: ${exercise.name}`,
    formTips: formTips.length
      ? formTips
      : [
          "Brace before the first rep",
          "Keep joints stacked through the path of motion",
          "Control the return - no bounce",
        ],
    voiceoverScript:
      (idea.voiceoverScript ?? "").trim() ||
      `Here's how to nail ${exercise.name}. Watch my setup, hit these form cues, and keep every rep honest. Grab a free Vitality Engine account for workouts that put this lift where it belongs.`,
  };
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
  return normalizeVideoIdea(item);
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

