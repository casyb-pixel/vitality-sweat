import { NextResponse } from "next/server";
import {
  createGeminiClient,
  getGeminiApiKey,
  getGeminiModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import { getCreatorRole } from "@/lib/auth/creator";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type AnalyzeMode = "multimodal" | "script" | "audience";

type AnalyzeBody = {
  /** Simple text prompt — preferred placeholder input. */
  input?: string;
  /** Alias for `input` (common client shape). */
  prompt?: string;
  mode?: AnalyzeMode;
  captionDraft?: string;
  clipMeta?: {
    fileName?: string | null;
    trimStart?: number;
    trimEnd?: number;
    duration?: number;
    recommendationLabel?: string | null;
  };
  /** Future multimodal video reference (URL / file id). */
  mediaRef?: string | null;
};

/**
 * Creator Studio → Gemini analyze endpoint.
 * Accepts `{ input }` / `{ prompt }` or a richer Creator Studio payload,
 * calls Gemini, and returns generated text as JSON.
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

    let body: AnalyzeBody;
    try {
      body = (await request.json()) as AnalyzeBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
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

    const prompt = buildPrompt(body);
    if (!prompt) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing input. Provide `input` / `prompt` (string) or a captionDraft / clipMeta payload.",
        },
        { status: 400 },
      );
    }

    const model = getGeminiModel();
    const mode: AnalyzeMode = body.mode ?? "script";

    try {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = (response.text ?? "").trim();
      if (!text) {
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
        text,
        suggestion: {
          caption: text,
          clipNotes: {
            fileName: body.clipMeta?.fileName ?? null,
            mediaRefReady: Boolean(body.mediaRef),
          },
        },
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
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

function buildPrompt(body: AnalyzeBody): string | null {
  const direct = (body.input ?? body.prompt ?? "").trim();
  if (direct) return direct;

  const caption = body.captionDraft?.trim() ?? "";
  const label = body.clipMeta?.recommendationLabel?.trim() ?? "";
  const fileName = body.clipMeta?.fileName?.trim() ?? "";
  const mode = body.mode ?? "script";

  if (!caption && !label && !fileName) return null;

  const trimSeconds =
    body.clipMeta?.duration && body.clipMeta.duration > 0
      ? Math.max(
          (body.clipMeta.trimEnd ?? 0) - (body.clipMeta.trimStart ?? 0),
          0,
        ).toFixed(1)
      : null;

  return [
    "You are the Vitality Sweat Creator Studio AI Director.",
    "Brand voice: direct, sweaty, encouraging — never corporate.",
    "Colors/identity cue: charcoal (#404040) + orange (#ff6600).",
    `Task mode: ${mode}.`,
    "Write a ready-to-post social caption (and brief on-screen cue if useful).",
    label ? `Linked Chronicles angle: ${label}` : null,
    fileName ? `Clip file: ${fileName}` : null,
    trimSeconds ? `Target keep length: ~${trimSeconds}s` : null,
    caption ? `Creator draft caption:\n${caption}` : null,
    "Return plain text only — no markdown fences.",
  ]
    .filter(Boolean)
    .join("\n");
}
