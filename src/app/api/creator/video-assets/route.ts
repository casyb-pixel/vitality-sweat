import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type {
  ShortFormVideoIdea,
  VideoAssetKind,
  VideoProjectState,
  VideoSocialPackage,
} from "@/lib/video/video-studio";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const maxDuration = 30;

const BUCKET = "creator-video-assets";
const SIGNED_URL_SECONDS = 60 * 60;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

type VideoAssetsAction =
  | "create_project"
  | "create_upload"
  | "confirm_upload"
  | "save_social_package"
  | "update_embed";

type RequestBody = {
  action?: VideoAssetsAction;
  projectId?: string;
  postId?: string;
  postSlug?: string;
  blogTitle?: string;
  concept?: Partial<ShortFormVideoIdea>;
  kind?: VideoAssetKind;
  fileName?: string;
  contentType?: string;
  size?: number;
  path?: string;
  socialPackage?: VideoSocialPackage;
  checklistKey?: string | null;
  targetSectionAnchor?: string | null;
  publicVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  embedPublished?: boolean;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return jsonError("Unauthorized — creator privileges required.", 401);
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    switch (body.action) {
      case "create_project":
        return createProject(supabase, user.id, body);
      case "create_upload":
        return createUpload(supabase, user.id, body);
      case "confirm_upload":
        return confirmUpload(supabase, user.id, body);
      case "save_social_package":
        return saveSocialPackage(supabase, user.id, body);
      case "update_embed":
        return updateEmbed(supabase, user.id, body);
      default:
        return jsonError(
          "Unknown action. Use create_project, create_upload, confirm_upload, save_social_package, or update_embed.",
          400,
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return jsonError(message, 500);
  }
}

async function createProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const blogTitle = body.blogTitle?.trim() ?? "";
  const concept = normalizeConcept(body.concept);
  if (!blogTitle || !concept.title) {
    return jsonError("blogTitle and concept.title are required.", 400);
  }

  const postId = body.postId || null;
  const postSlug = body.postSlug?.trim() || null;
  const checklistKey =
    typeof body.checklistKey === "string" ? body.checklistKey.trim() : null;

  if (
    checklistKey &&
    checklistKey !== "video_1_done" &&
    checklistKey !== "video_2_done" &&
    checklistKey !== "video_3_done"
  ) {
    return jsonError("Invalid checklistKey.", 400);
  }

  // Reuse a marketing-panel stub (section chosen, clip not uploaded yet).
  if (postId) {
    let stubQuery = supabase
      .from("video_projects")
      .select("*")
      .eq("post_id", postId)
      .eq("creator_id", userId)
      .is("video_path", null)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (checklistKey) {
      stubQuery = stubQuery.eq("checklist_key", checklistKey);
    } else {
      stubQuery = stubQuery.not("checklist_key", "is", null);
    }

    const { data: stub, error: stubError } = await stubQuery.maybeSingle();
    if (stubError) return jsonError(stubError.message, 502);

    if (stub) {
      const { data, error } = await supabase
        .from("video_projects")
        .update({
          blog_title: blogTitle,
          post_slug: postSlug ?? stub.post_slug,
          concept,
          status: "collecting_assets",
          ...(checklistKey ? { checklist_key: checklistKey } : {}),
        })
        .eq("id", stub.id)
        .select("*")
        .single();
      if (error) return jsonError(error.message, 502);
      return NextResponse.json({
        ok: true,
        project: mapProject(data as ProjectRow),
      });
    }
  }

  const { data, error } = await supabase
    .from("video_projects")
    .insert({
      creator_id: userId,
      post_id: postId,
      post_slug: postSlug,
      blog_title: blogTitle,
      concept,
      status: "collecting_assets",
      checklist_key: checklistKey,
      target_section_anchor:
        typeof body.targetSectionAnchor === "string"
          ? body.targetSectionAnchor.trim() || null
          : null,
      embed_published: false,
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 502);
  return NextResponse.json({
    ok: true,
    project: mapProject(data as ProjectRow),
  });
}

async function createUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const projectId = body.projectId?.trim() ?? "";
  const kind = body.kind;
  const fileName = body.fileName?.trim() ?? "";
  const contentType = body.contentType?.trim().toLowerCase() ?? "";
  const size = Number(body.size);

  if (!projectId || !kind || !fileName || !contentType || !size) {
    return jsonError(
      "projectId, kind, fileName, contentType, and size are required.",
      400,
    );
  }

  const validationError = validateAsset(kind, contentType, size);
  if (validationError) return jsonError(validationError, 400);

  const project = await getOwnedProject(supabase, userId, projectId);
  if (!project) return jsonError("Video project not found.", 404);

  const extension = safeExtension(fileName, contentType);
  const path = `${userId}/${projectId}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return jsonError(error?.message ?? "Could not create upload URL.", 502);
  }

  return NextResponse.json({
    ok: true,
    bucket: BUCKET,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    expiresIn: 7200,
  });
}

async function confirmUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const projectId = body.projectId?.trim() ?? "";
  const path = body.path?.trim() ?? "";
  const kind = body.kind;
  if (!projectId || !path || !kind) {
    return jsonError("projectId, path, and kind are required.", 400);
  }

  const ownedPrefix = `${userId}/${projectId}/`;
  if (!path.startsWith(ownedPrefix)) {
    return jsonError("Asset path does not belong to this project.", 403);
  }

  const project = await getOwnedProject(supabase, userId, projectId);
  if (!project) return jsonError("Video project not found.", 404);

  const update =
    kind === "video" ? { video_path: path } : { voiceover_path: path };
  const nextVideoPath = kind === "video" ? path : project.video_path;
  const nextVoicePath = kind === "voiceover" ? path : project.voiceover_path;
  const hasPlayback =
    Boolean(nextVideoPath) || Boolean(project.public_video_url?.trim());
  const embedPublished =
    Boolean(project.target_section_anchor?.trim()) && hasPlayback;

  const { data, error } = await supabase
    .from("video_projects")
    .update({
      ...update,
      status:
        nextVideoPath || nextVoicePath ? "assets_ready" : "collecting_assets",
      embed_published: embedPublished,
    })
    .eq("id", projectId)
    .eq("creator_id", userId)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 502);

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (signedError || !signed) {
    return jsonError(
      signedError?.message ?? "Could not create temporary media URL.",
      502,
    );
  }

  return NextResponse.json({
    ok: true,
    project: mapProject(data as ProjectRow),
    asset: {
      kind,
      path,
      signedUrl: signed.signedUrl,
      expiresAt: new Date(
        Date.now() + SIGNED_URL_SECONDS * 1000,
      ).toISOString(),
      fileName: body.fileName ?? path.split("/").pop() ?? kind,
      contentType: body.contentType ?? "",
      size: Number(body.size) || 0,
    },
  });
}

async function saveSocialPackage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const projectId = body.projectId?.trim() ?? "";
  if (!projectId || !body.socialPackage) {
    return jsonError("projectId and socialPackage are required.", 400);
  }

  const { data, error } = await supabase
    .from("video_projects")
    .update({
      social_package: body.socialPackage,
      status: "social_package_ready",
    })
    .eq("id", projectId)
    .eq("creator_id", userId)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 502);
  return NextResponse.json({
    ok: true,
    project: mapProject(data as ProjectRow),
  });
}

async function updateEmbed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const projectId = body.projectId?.trim() ?? "";
  if (!projectId) return jsonError("projectId is required.", 400);

  const project = await getOwnedProject(supabase, userId, projectId);
  if (!project) return jsonError("Video project not found.", 404);

  const targetSectionAnchor =
    body.targetSectionAnchor === undefined
      ? project.target_section_anchor?.trim() || null
      : typeof body.targetSectionAnchor === "string"
        ? body.targetSectionAnchor.trim() || null
        : null;

  const publicVideoUrl =
    body.publicVideoUrl === undefined
      ? project.public_video_url?.trim() || null
      : typeof body.publicVideoUrl === "string"
        ? body.publicVideoUrl.trim() || null
        : null;

  const thumbnailUrl =
    body.thumbnailUrl === undefined
      ? project.thumbnail_url?.trim() || null
      : typeof body.thumbnailUrl === "string"
        ? body.thumbnailUrl.trim() || null
        : null;

  const checklistKey =
    body.checklistKey === undefined
      ? project.checklist_key?.trim() || null
      : typeof body.checklistKey === "string"
        ? body.checklistKey.trim() || null
        : null;

  if (
    checklistKey &&
    checklistKey !== "video_1_done" &&
    checklistKey !== "video_2_done" &&
    checklistKey !== "video_3_done"
  ) {
    return jsonError("Invalid checklistKey.", 400);
  }

  const hasPlayback =
    Boolean(project.video_path?.trim()) || Boolean(publicVideoUrl);
  const embedPublished =
    typeof body.embedPublished === "boolean"
      ? body.embedPublished && Boolean(targetSectionAnchor) && hasPlayback
      : Boolean(targetSectionAnchor) && hasPlayback;

  const { data, error } = await supabase
    .from("video_projects")
    .update({
      target_section_anchor: targetSectionAnchor,
      public_video_url: publicVideoUrl,
      thumbnail_url: thumbnailUrl,
      checklist_key: checklistKey,
      embed_published: embedPublished,
    })
    .eq("id", projectId)
    .eq("creator_id", userId)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 502);
  return NextResponse.json({
    ok: true,
    project: mapProject(data as ProjectRow),
  });
}

async function getOwnedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("video_projects")
    .select("*")
    .eq("id", projectId)
    .eq("creator_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProjectRow | null) ?? null;
}

function validateAsset(
  kind: VideoAssetKind,
  contentType: string,
  size: number,
): string | null {
  if (kind === "video") {
    if (!contentType.startsWith("video/")) {
      return "Gym clips must be video files.";
    }
    if (size > MAX_VIDEO_BYTES) {
      return "Gym clips must be 250 MB or smaller.";
    }
  } else {
    if (!contentType.startsWith("audio/")) {
      return "Voiceovers must be audio files.";
    }
    if (size > MAX_AUDIO_BYTES) {
      return "Voiceovers must be 25 MB or smaller.";
    }
  }
  return null;
}

function safeExtension(fileName: string, contentType: string): string {
  const candidate = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(candidate)) return candidate;
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  return "webm";
}

function normalizeConcept(
  value: Partial<ShortFormVideoIdea> | undefined,
): ShortFormVideoIdea {
  return {
    title: value?.title?.trim() ?? "",
    videoHook: value?.videoHook?.trim() ?? "",
    shootingConcept: value?.shootingConcept?.trim() ?? "",
  };
}

type ProjectRow = {
  id: string;
  creator_id: string;
  post_id: string | null;
  post_slug: string | null;
  blog_title: string;
  concept: ShortFormVideoIdea;
  status: VideoProjectState["status"];
  video_path: string | null;
  voiceover_path: string | null;
  target_section_anchor?: string | null;
  checklist_key?: string | null;
  thumbnail_url?: string | null;
  public_video_url?: string | null;
  embed_published?: boolean | null;
};

function mapProject(row: ProjectRow): VideoProjectState {
  return {
    id: row.id,
    creatorId: row.creator_id,
    postId: row.post_id,
    postSlug: row.post_slug,
    blogTitle: row.blog_title,
    concept: normalizeConcept(row.concept),
    status: row.status,
    videoPath: row.video_path,
    voiceoverPath: row.voiceover_path,
    targetSectionAnchor: row.target_section_anchor?.trim() || null,
    checklistKey: row.checklist_key?.trim() || null,
    thumbnailUrl: row.thumbnail_url?.trim() || null,
    publicVideoUrl: row.public_video_url?.trim() || null,
    embedPublished: Boolean(row.embed_published),
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
