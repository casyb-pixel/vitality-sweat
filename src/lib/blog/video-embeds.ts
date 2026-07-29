import { createServiceRoleClient } from "@/utils/supabase/admin";

export type BlogVideoEmbed = {
  id: string;
  targetSectionAnchor: string;
  title: string;
  /** Playable URL for HTML5 video (signed storage or direct MP4). */
  playbackUrl: string | null;
  /** YouTube / Vimeo watch or embed URL when hosted externally. */
  externalUrl: string | null;
  thumbnailUrl: string | null;
  provider: "file" | "youtube" | "vimeo" | "unknown";
};

type VideoProjectEmbedRow = {
  id: string;
  target_section_anchor: string | null;
  thumbnail_url: string | null;
  public_video_url: string | null;
  video_path: string | null;
  embed_published: boolean;
  concept: unknown;
  post_slug: string | null;
  post_id: string | null;
};

const BUCKET = "creator-video-assets";
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Load embed-ready videos for a published Chronicle.
 * Uses the service role so private storage can be signed for public readers.
 */
export async function fetchPublishedVideoEmbedsForPost(input: {
  postId?: string | null;
  slug: string;
}): Promise<BlogVideoEmbed[]> {
  const admin = createServiceRoleClient();
  if (!admin) return [];

  let query = admin
    .from("video_projects")
    .select(
      "id, target_section_anchor, thumbnail_url, public_video_url, video_path, embed_published, concept, post_slug, post_id",
    )
    .eq("embed_published", true)
    .not("target_section_anchor", "is", null);

  if (input.postId) {
    query = query.or(
      `post_id.eq.${input.postId},post_slug.eq.${input.slug}`,
    );
  } else {
    query = query.eq("post_slug", input.slug);
  }

  const { data, error } = await query;
  if (error || !data?.length) return [];

  const embeds: BlogVideoEmbed[] = [];

  for (const row of data as VideoProjectEmbedRow[]) {
    const anchor = row.target_section_anchor?.trim();
    if (!anchor) continue;

    const external = classifyExternalUrl(row.public_video_url);
    let playbackUrl: string | null = null;

    if (external.provider === "file" && external.url) {
      playbackUrl = external.url;
    } else if (row.video_path?.trim()) {
      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.video_path.trim(), SIGNED_URL_SECONDS);
      if (!signError && signed?.signedUrl) {
        playbackUrl = signed.signedUrl;
      }
    }

    const hasMedia =
      Boolean(playbackUrl) ||
      external.provider === "youtube" ||
      external.provider === "vimeo";

    // Empty / not-uploaded yet: skip injection so the article stays clean.
    if (!hasMedia) continue;

    embeds.push({
      id: row.id,
      targetSectionAnchor: anchor,
      title: conceptTitle(row.concept) || "Watch this tip",
      playbackUrl,
      externalUrl:
        external.provider === "youtube" || external.provider === "vimeo"
          ? external.url
          : null,
      thumbnailUrl: row.thumbnail_url?.trim() || null,
      provider: external.provider === "file" && playbackUrl
        ? "file"
        : external.provider === "youtube" || external.provider === "vimeo"
          ? external.provider
          : playbackUrl
            ? "file"
            : "unknown",
    });
  }

  return embeds;
}

function conceptTitle(concept: unknown): string {
  if (!concept || typeof concept !== "object") return "";
  const title = (concept as { title?: unknown }).title;
  return typeof title === "string" ? title.trim() : "";
}

function classifyExternalUrl(raw: string | null | undefined): {
  provider: "file" | "youtube" | "vimeo" | "unknown";
  url: string | null;
} {
  const url = raw?.trim() || null;
  if (!url) return { provider: "unknown", url: null };
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return { provider: "youtube", url };
  }
  if (/vimeo\.com/i.test(url)) {
    return { provider: "vimeo", url };
  }
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.startsWith("http")) {
    return { provider: "file", url };
  }
  return { provider: "unknown", url };
}

/** Build a YouTube embed src from a watch / short / youtu.be URL. */
export function toYouTubeEmbedSrc(
  url: string,
  options?: { autoplay?: boolean },
): string | null {
  const autoplay = options?.autoplay !== false;
  const suffix = autoplay ? "autoplay=1&rel=0" : "rel=0";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}?${suffix}` : null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2];
      return id ? `https://www.youtube.com/embed/${id}?${suffix}` : null;
    }
    const id = u.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}?${suffix}` : null;
  } catch {
    return null;
  }
}

export function toVimeoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts[0];
    return id && /^\d+$/.test(id)
      ? `https://player.vimeo.com/video/${id}?autoplay=1`
      : null;
  } catch {
    return null;
  }
}
