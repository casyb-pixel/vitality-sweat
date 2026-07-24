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
  | "save_social_package";

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
      default:
        return jsonError(
          "Unknown action. Use create_project, create_upload, confirm_upload, or save_social_package.",
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

  const { data, error } = await supabase
    .from("video_projects")
    .insert({
      creator_id: userId,
      post_id: body.postId || null,
      post_slug: body.postSlug?.trim() || null,
      blog_title: blogTitle,
      concept,
      status: "collecting_assets",
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

  const { data, error } = await supabase
    .from("video_projects")
    .update({
      ...update,
      status:
        nextVideoPath || nextVoicePath ? "assets_ready" : "collecting_assets",
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
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
