import { FinishReason, Modality } from "@google/genai";
import { NextResponse } from "next/server";
import { buildBrandVisualAidPrompt } from "@/lib/ai/brand-visual";
import {
  createGeminiClient,
  getGeminiApiKey,
  getGeminiImageModel,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import { getCreatorRole } from "@/lib/auth/creator";
import { uploadBlogVisualAid } from "@/lib/storage/blog-images";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Node runtime required for Buffer + Supabase Storage uploads.
 * Text blog-assist (ideas / finalize) runs on Edge separately.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

type VisualBody = {
  title?: string;
  excerpt?: string;
  notes?: string;
  bodyMarkdown?: string;
  /** Preferred: ready-made prompt from finalize_post.imagePrompt.prompt */
  imagePrompt?: string;
  altHint?: string;
};

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

    let body: VisualBody;
    try {
      body = (await request.json()) as VisualBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const title = (body.title ?? "").trim();
    const excerpt = (body.excerpt ?? "").trim();
    const notes = (body.notes ?? "").trim();
    const bodyMarkdown = (body.bodyMarkdown ?? "").trim();
    const imagePrompt = (body.imagePrompt ?? "").trim();

    if (!imagePrompt && !notes && !title && !excerpt && !bodyMarkdown) {
      return NextResponse.json(
        {
          ok: false,
          error: "Provide imagePrompt or title/notes for visual generation.",
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

    const model = getGeminiImageModel();
    const prompt =
      imagePrompt ||
      buildBrandVisualAidPrompt({ title, excerpt, notes, bodyMarkdown });

    try {
      const ai = createGeminiClient(apiKey);
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K",
          },
        },
      });

      const collected: { data: string; mimeType: string }[] = [];
      let textNotes = "";
      let lastFinishReason: string | undefined;

      for await (const chunk of stream) {
        const finishReason = chunk.candidates?.[0]?.finishReason;
        if (finishReason) lastFinishReason = String(finishReason);

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

      if (!collected.length) {
        return NextResponse.json(
          {
            ok: false,
            provider: "gemini",
            model,
            error:
              lastFinishReason === FinishReason.MAX_TOKENS
                ? "Gemini hit a token limit before returning image bytes."
                : "Gemini returned no image data.",
            finishReason: lastFinishReason ?? null,
            textNotes: textNotes.trim() || null,
          },
          { status: 502 },
        );
      }

      const image = collected[collected.length - 1]!;
      const buffer = Buffer.from(image.data, "base64");
      if (!buffer.byteLength) {
        return NextResponse.json(
          { ok: false, error: "Decoded image buffer was empty." },
          { status: 502 },
        );
      }

      const serviceClient = createServiceRoleClient();
      const storageClient = serviceClient ?? supabase;
      const uploaded = await uploadBlogVisualAid({
        supabase: storageClient,
        buffer,
        mimeType: image.mimeType,
        title: title || "Vitality Sweat visual aid",
        altHint:
          body.altHint?.trim() ||
          (title
            ? `${title} — Vitality Sweat visual aid`
            : "Vitality Sweat Sweatlife Chronicles visual aid"),
      });

      return NextResponse.json({
        ok: true,
        provider: "gemini",
        model,
        finishReason: lastFinishReason ?? null,
        textNotes: textNotes.trim() || null,
        visual: {
          markdown: uploaded.markdown,
          publicUrl: uploaded.publicUrl,
          path: uploaded.path,
          alt: uploaded.alt,
          mimeType: uploaded.mimeType,
          model,
        },
        markdown: uploaded.markdown,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gemini image request failed.";
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
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
