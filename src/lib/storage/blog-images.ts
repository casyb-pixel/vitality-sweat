import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSeoImageBasename } from "@/lib/ai/brand-visual";

export const BLOG_IMAGES_BUCKET =
  process.env.SUPABASE_BLOG_IMAGES_BUCKET?.trim() || "blog-images";

export type UploadedBlogImage = {
  path: string;
  publicUrl: string;
  markdown: string;
  alt: string;
  mimeType: string;
  bytes: number;
};

/**
 * Uploads an inline Gemini image buffer to the public blog-images bucket
 * and returns a markdown snippet for the editor.
 */
export async function uploadBlogVisualAid(options: {
  supabase: SupabaseClient;
  buffer: Buffer;
  mimeType: string;
  title: string;
  altHint?: string;
}): Promise<UploadedBlogImage> {
  const { supabase, buffer, mimeType, title, altHint } = options;
  const ext = extensionForMime(mimeType);
  const basename = buildSeoImageBasename(title);
  const path = `chronicles/${basename}.${ext}`;
  const alt =
    (altHint?.trim() ||
      `${title.trim() || "Vitality Sweat"} — Sweatlife Chronicles visual aid`).slice(
      0,
      140,
    );

  console.info(
    `[blog-images] Uploading ${path} (${mimeType}, ${buffer.byteLength} bytes) to bucket "${BLOG_IMAGES_BUCKET}"`,
  );

  const { error: uploadError } = await supabase.storage
    .from(BLOG_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "31536000",
    });

  if (uploadError) {
    console.error("[blog-images] Upload failed:", uploadError.message);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  const markdown = `![${escapeMarkdownAlt(alt)}](${publicUrl})`;

  console.info(`[blog-images] Public URL ready: ${publicUrl}`);

  return {
    path,
    publicUrl,
    markdown,
    alt,
    mimeType,
    bytes: buffer.byteLength,
  };
}

function extensionForMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  return "png";
}

function escapeMarkdownAlt(value: string): string {
  return value.replace(/[[\]]/g, "");
}
