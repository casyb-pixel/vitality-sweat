import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type {
  ShortFormVideoIdea,
  VideoAssetKind,
  VideoAssetReference,
  VideoProjectState,
  VideoProjectStatus,
  VideoProjectSummary,
  VideoSocialPackage,
} from "@/lib/video/video-studio";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "creator-video-assets";
const SIGNED_URL_SECONDS = 60 * 60;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

type VideoAssetsAction =
  | "list_projects"
  | "get_project"
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
  limit?: number;
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
      case "list_projects":
        return listProjects(supabase, user.id, body);
      case "get_project":
        return getProject(supabase, user.id, body);
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
          "Unknown action. Use list_projects, get_project, create_project, create_upload, confirm_upload, save_social_package, or update_embed.",
          400,
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return jsonError(message, 500);
  }
}

async function listProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const limit = Math.min(Math.max(Number(body.limit) || 12, 1), 40);
  const { data, error } = await supabase
    .from("video_projects")
    .select(
      "id, blog_title, post_slug, concept, status, video_path, voiceover_path, merged_path, social_package, updated_at",
    )
    .eq("creator_id", userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return jsonError(error.message, 502);

  const projects: VideoProjectSummary[] = (data ?? []).map((row) => {
    const concept = normalizeConcept(
      row.concept as Partial<ShortFormVideoIdea> | undefined,
    );
    return {
      id: row.id as string,
      blogTitle: (row.blog_title as string) ?? "",
      postSlug: (row.post_slug as string | null) ?? null,
      conceptTitle: concept.title,
      status: row.status as VideoProjectStatus,
      hasVideo: Boolean(row.video_path),
      hasVoiceover: Boolean(row.voiceover_path),
      hasMerged: Boolean(row.merged_path),
      hasSocialPackage: Boolean(row.social_package),
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    };
  });

  return NextResponse.json({ ok: true, projects });
}

async function getProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: RequestBody,
) {
  const projectId = body.projectId?.trim() ?? "";
  if (!projectId) return jsonError("projectId is required.", 400);

  const project = await getOwnedProject(supabase, userId, projectId);
  if (!project) return jsonError("Video project not found.", 404);

  const mapped = mapProject(project);
  const [video, voiceover, merged] = await Promise.all([
    signAsset(supabase, "video", project.video_path),
    signAsset(supabase, "voiceover", project.voiceover_path),
    signAsset(supabase, "merged", project.merged_path),
  ]);

  return NextResponse.json({
    ok: true,
    project: {
      ...mapped,
      video: video ?? undefined,
      voiceover: voiceover ?? undefined,
      merged: merged ?? undefined,
    },
  });
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
    kind === "video"
      ? { video_path: path, merged_path: null }
      : kind === "voiceover"
        ? { voiceover_path: path, merged_path: null }
        : { merged_path: path };

  const nextVideoPath = kind === "video" ? path : project.video_path;
  const nextVoicePath = kind === "voiceover" ? path : project.voiceover_path;
  const nextMergedPath = kind === "merged" ? path : null;
  const hasPlayback =
    Boolean(nextMergedPath) ||
    Boolean(nextVideoPath) ||
    Boolean(project.public_video_url?.trim());
  const embedPublished =
    Boolean(project.target_section_anchor?.trim()) && hasPlayback;

  let status: VideoProjectStatus = project.status;
  if (kind === "merged") {
    status = "merged_ready";
  } else if (nextVideoPath || nextVoicePath) {
    // Replacing source assets invalidates a prior merge.
    status =
      project.status === "social_package_ready"
        ? "social_package_ready"
        : "assets_ready";
  } else {
    status = "collecting_assets";
  }

  const { data, error } = await supabase
    .from("video_projects")
    .update({
      ...update,
      status,
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
    } satisfies VideoAssetReference,
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

  const project = await getOwnedProject(supabase, userId, projectId);
  if (!project) return jsonError("Video project not found.", 404);

  const concept = normalizeConcept(project.concept);
  const { buildVideoGrowthPromoPack } = await import(
    "@/lib/marketing/growth-packaging"
  );
  const growthPromoPack = buildVideoGrowthPromoPack({
    blogTitle: project.blog_title,
    conceptTitle: concept.title,
    baseCaption: body.socialPackage.caption,
    baseDescription: body.socialPackage.seoMetadata?.description,
  });

  const { data, error } = await supabase
    .from("video_projects")
    .update({
      social_package: body.socialPackage,
      growth_promo_pack: growthPromoPack,
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
    growthPromoPack,
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
    Boolean(project.merged_path?.trim()) ||
    Boolean(project.video_path?.trim()) ||
    Boolean(publicVideoUrl);
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

async function signAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: VideoAssetKind,
  path: string | null | undefined,
): Promise<VideoAssetReference | null> {
  const clean = path?.trim();
  if (!clean) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(clean, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return {
    kind,
    path: clean,
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString(),
    fileName: clean.split("/").pop() ?? kind,
    contentType:
      kind === "voiceover"
        ? "audio/webm"
        : kind === "merged"
          ? "video/mp4"
          : "video/mp4",
    size: 0,
  };
}

function validateAsset(
  kind: VideoAssetKind,
  contentType: string,
  size: number,
): string | null {
  if (kind === "voiceover") {
    if (!contentType.startsWith("audio/")) {
      return "Voiceovers must be audio files.";
    }
    if (size > MAX_AUDIO_BYTES) {
      return "Voiceovers must be 25 MB or smaller.";
    }
    return null;
  }

  if (!contentType.startsWith("video/")) {
    return kind === "merged"
      ? "Synced clips must be video files."
      : "Gym clips must be video files.";
  }
  if (size > MAX_VIDEO_BYTES) {
    return "Video files must be 250 MB or smaller.";
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
  status: VideoProjectStatus;
  video_path: string | null;
  voiceover_path: string | null;
  merged_path?: string | null;
  social_package?: VideoSocialPackage | null;
  growth_promo_pack?: import("@/lib/marketing/growth-packaging").VideoGrowthPromoPack | null;
  target_section_anchor?: string | null;
  checklist_key?: string | null;
  thumbnail_url?: string | null;
  public_video_url?: string | null;
  embed_published?: boolean | null;
  updated_at?: string | null;
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
    mergedPath: row.merged_path ?? null,
    socialPackage: row.social_package ?? null,
    growthPromoPack: row.growth_promo_pack ?? null,
    targetSectionAnchor: row.target_section_anchor?.trim() || null,
    checklistKey: row.checklist_key?.trim() || null,
    thumbnailUrl: row.thumbnail_url?.trim() || null,
    publicVideoUrl: row.public_video_url?.trim() || null,
    embedPublished: Boolean(row.embed_published),
    updatedAt: row.updated_at ?? null,
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
