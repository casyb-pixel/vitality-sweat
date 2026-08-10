"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { extractSectionOptionsFromPostBody } from "@/lib/blog/heading-anchor";
import type {
  CreatorPublishedPost,
  ShortFormVideoIdea,
  VideoAssetKind,
  VideoAssetReference,
  VideoGrowthPromoPack,
  VideoProjectState,
  VideoProjectSummary,
  VideoSocialPackage,
  VideoStudioPhase,
} from "@/lib/video/video-studio";
import {
  canLikelyCompressInBrowser,
  COMPRESS_OFFER_BYTES,
  compressVideoTo720p,
  FREE_PLAN_MAX_UPLOAD_BYTES,
  formatUploadBytes,
  type CompressProgress,
} from "@/lib/video/compress-720p";
import {
  canLikelyMergeInBrowser,
  mergeVideoWithVoiceover,
  type MergeProgress,
} from "@/lib/video/merge-av";
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";
import type { VideoScriptPreset } from "@/lib/marketing/campaign-templates";
import { APP_INVITE_SCRIPT_GUIDANCE } from "@/lib/marketing/campaign-templates";
import { METROS, type MetroId } from "@/lib/markets/metros";

const PHASE_ORDER: VideoStudioPhase[] = [
  "SELECT_BLOG_CONTEXT",
  "VIDEO_IDEAS_DISPLAY",
  "ASSET_COLLECTION",
  "SYNC_MERGE",
  "PRODUCTION_REVIEW",
];

const PHASE_LABELS: Record<VideoStudioPhase, string> = {
  SELECT_BLOG_CONTEXT: "Pick blog",
  VIDEO_IDEAS_DISPLAY: "Pick idea",
  ASSET_COLLECTION: "Assets",
  SYNC_MERGE: "Sync",
  PRODUCTION_REVIEW: "Export",
};

const bigButtonClass =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 bg-brand-orange px-5 py-4 font-sans text-base font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-orange-deep active:bg-brand-orange-deep disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center border-2 border-brand-ink/20 bg-surface-elevated px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        dark
          ? "border-brand-orange/30 border-t-brand-orange"
          : "border-white/30 border-t-white"
      }`}
      aria-hidden
    />
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Published";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Published";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VideoWizard({
  scriptPreset: scriptPresetProp = "standard",
  onScriptPresetConsumed,
}: {
  scriptPreset?: VideoScriptPreset;
  onScriptPresetConsumed?: () => void;
} = {}) {
  const videoInputId = useId();
  const videoCameraInputId = useId();
  const [phase, setPhase] = useState<VideoStudioPhase>("SELECT_BLOG_CONTEXT");
  const [scriptPreset, setScriptPreset] =
    useState<VideoScriptPreset>(scriptPresetProp);
  const [market, setMarket] = useState<MetroId>("lafayette");

  useEffect(() => {
    if (scriptPresetProp === "app_invite") {
      setScriptPreset("app_invite");
      onScriptPresetConsumed?.();
    }
  }, [scriptPresetProp, onScriptPresetConsumed]);

  // Step 1
  const [posts, setPosts] = useState<CreatorPublishedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] =
    useState<CreatorPublishedPost | null>(null);

  // Step 2
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ShortFormVideoIdea[]>([]);
  const [ideasLocked, setIdeasLocked] = useState(false);
  const [ideasLockedAt, setIdeasLockedAt] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(
    null,
  );
  const [selectedIdea, setSelectedIdea] = useState<ShortFormVideoIdea | null>(
    null,
  );

  // Step 3
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoAsset, setVideoAsset] = useState<VideoAssetReference | null>(null);
  const [voiceoverAsset, setVoiceoverAsset] =
    useState<VideoAssetReference | null>(null);
  const [mergedAsset, setMergedAsset] = useState<VideoAssetReference | null>(
    null,
  );
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [project, setProject] = useState<VideoProjectState | null>(null);
  const [resumeProjects, setResumeProjects] = useState<VideoProjectSummary[]>(
    [],
  );
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeProgress, setMergeProgress] = useState<MergeProgress | null>(
    null,
  );
  const [assetUploadKind, setAssetUploadKind] =
    useState<VideoAssetKind | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] =
    useState<CompressProgress | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Step 4
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [pack, setPack] = useState<VideoSocialPackage | null>(null);
  const [growthPack, setGrowthPack] = useState<VideoGrowthPromoPack | null>(
    null,
  );
  const [copiedGrowthKey, setCopiedGrowthKey] = useState<string | null>(null);
  const [targetSectionAnchor, setTargetSectionAnchor] = useState("");
  const [embedSaving, setEmbedSaving] = useState(false);
  const [embedMessage, setEmbedMessage] = useState<string | null>(null);

  const stepIndex = PHASE_ORDER.indexOf(phase);

  const sectionOptions = useMemo(() => {
    if (!selectedPost) return [];
    return extractSectionOptionsFromPostBody({
      bodyMarkdown: selectedPost.bodyMarkdown,
    });
  }, [selectedPost]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const res = await fetch("/api/creator/posts");
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        posts?: CreatorPublishedPost[];
      };
      if (!res.ok || !data.ok) {
        setPostsError(data.error ?? "Couldn't load published posts.");
        setPosts([]);
        return;
      }
      setPosts(data.posts ?? []);
    } catch (error) {
      setPostsError(
        error instanceof Error ? error.message : "Network error loading posts.",
      );
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadResumeProjects = useCallback(async () => {
    setResumeLoading(true);
    setResumeError(null);
    try {
      const res = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_projects", limit: 12 }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        projects?: VideoProjectSummary[];
      };
      if (!res.ok || !data.ok) {
        setResumeError(data.error ?? "Couldn't load saved shoots.");
        setResumeProjects([]);
        return;
      }
      setResumeProjects(
        (data.projects ?? []).filter(
          (p) => p.hasVideo || p.hasVoiceover || p.hasMerged,
        ),
      );
    } catch (error) {
      setResumeError(
        error instanceof Error
          ? error.message
          : "Network error loading saved shoots.",
      );
    } finally {
      setResumeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
    void loadResumeProjects();
  }, [loadPosts, loadResumeProjects]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [videoUrl, audioUrl, mergedUrl]);

  async function selectBlog(post: CreatorPublishedPost) {
    setSelectedPost(post);
    setSelectedIdea(null);
    setIdeas([]);
    setIdeasError(null);
    setPack(null);
    setGrowthPack(null);
    setPackError(null);
    setMergeError(null);
    setPhase("VIDEO_IDEAS_DISPLAY");
    // Keep loading ideas for this blog (existing effect / call below).
    await loadIdeasForPost(post);
  }

  function statusLabel(status: VideoProjectSummary["status"]): string {
    switch (status) {
      case "collecting_assets":
        return "Collecting";
      case "assets_ready":
        return "Assets ready";
      case "merged_ready":
        return "Synced";
      case "social_package_ready":
        return "Export ready";
      case "exported":
        return "Exported";
      default:
        return status;
    }
  }

  function phaseForProject(project: VideoProjectState): VideoStudioPhase {
    if (project.socialPackage || project.status === "social_package_ready") {
      return "PRODUCTION_REVIEW";
    }
    if (project.mergedPath || project.status === "merged_ready") {
      return "SYNC_MERGE";
    }
    if (project.videoPath && project.voiceoverPath) {
      return "SYNC_MERGE";
    }
    return "ASSET_COLLECTION";
  }

  async function resumeProject(summary: VideoProjectSummary) {
    setResumingId(summary.id);
    setResumeError(null);
    setIdeasError(null);
    try {
      const res = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_project",
          projectId: summary.id,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        project?: VideoProjectState;
      };
      if (!res.ok || !data.ok || !data.project) {
        throw new Error(data.error ?? "Couldn't open that shoot.");
      }

      const next = data.project;
      const matchedPost =
        posts.find((p) => p.id === next.postId) ||
        posts.find((p) => p.slug === next.postSlug) ||
        null;

      if (!matchedPost) {
        // Minimal stub so later steps still have a title/slug.
        setSelectedPost({
          id: next.postId ?? next.id,
          slug: next.postSlug ?? "shoot",
          title: next.blogTitle,
          excerpt: "",
          description: null,
          keywords: [],
          coverImage: null,
          publishedAt: null,
          bodyPreview: "",
          bodyMarkdown: "",
        });
      } else {
        setSelectedPost(matchedPost);
      }

      setSelectedIdea(next.concept);
      setIdeas([next.concept]);
      setIdeasLocked(true);
      setProject(next);
      setPack(next.socialPackage ?? null);
      setGrowthPack(next.growthPromoPack ?? null);
      setTargetSectionAnchor(next.targetSectionAnchor ?? "");
      setEmbedMessage(null);
      setAssetError(null);
      setMergeError(null);
      setPackError(null);

      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      setVideoFile(null);
      setAudioBlob(null);
      setMergedBlob(null);

      if (next.video) {
        setVideoAsset(next.video);
        setVideoUrl(next.video.signedUrl);
      } else {
        setVideoAsset(null);
        setVideoUrl(null);
      }
      if (next.voiceover) {
        setVoiceoverAsset(next.voiceover);
        setAudioUrl(next.voiceover.signedUrl);
      } else {
        setVoiceoverAsset(null);
        setAudioUrl(null);
      }
      if (next.merged) {
        setMergedAsset(next.merged);
        setMergedUrl(next.merged.signedUrl);
      } else {
        setMergedAsset(null);
        setMergedUrl(null);
      }

      const nextPhase = phaseForProject(next);
      if (
        nextPhase === "PRODUCTION_REVIEW" &&
        !next.socialPackage
      ) {
        setPhase("SYNC_MERGE");
      } else {
        setPhase(nextPhase);
      }
    } catch (error) {
      setResumeError(
        error instanceof Error ? error.message : "Could not resume that shoot.",
      );
    } finally {
      setResumingId(null);
    }
  }

  async function loadIdeasForPost(post: CreatorPublishedPost) {
    setIdeasLocked(false);
    setIdeasLockedAt(null);
    setIdeasError(null);
    setIdeasLoading(true);
    setPhase("VIDEO_IDEAS_DISPLAY");

    try {
      // Prefer locked ideas so gym trips / re-entry don't reshuffle the set.
      const lockedRes = await fetch(
        `/api/creator/video-ideas?postId=${encodeURIComponent(post.id)}`,
      );
      const lockedJson = (await lockedRes.json()) as {
        ok?: boolean;
        locked?: boolean;
        ideas?: ShortFormVideoIdea[];
        lockedAt?: string;
        error?: string;
      };
      if (
        lockedRes.ok &&
        lockedJson.ok &&
        lockedJson.locked &&
        lockedJson.ideas &&
        lockedJson.ideas.length > 0
      ) {
        setIdeas(lockedJson.ideas);
        setIdeasLocked(true);
        setIdeasLockedAt(lockedJson.lockedAt ?? null);
        return;
      }

      const res = await fetch("/api/creator/video-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_video_ideas",
          blogTitle: post.title,
          bodyMarkdown: post.bodyMarkdown || post.bodyPreview,
          scriptPreset,
          post: {
            title: post.title,
            excerpt: post.excerpt,
            keywords: post.keywords,
            bodyMarkdown: post.bodyMarkdown || post.bodyPreview,
            slug: post.slug,
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        ideas?: ShortFormVideoIdea[];
      };
      if (!res.ok || !data.ok || !data.ideas?.length) {
        setIdeasError(data.error ?? "Couldn't generate video ideas.");
        return;
      }

      const saveRes = await fetch("/api/creator/video-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          postId: post.id,
          postSlug: post.slug,
          blogTitle: post.title,
          ideas: data.ideas,
        }),
      });
      const saveJson = (await saveRes.json()) as {
        ok?: boolean;
        ideas?: ShortFormVideoIdea[];
        lockedAt?: string;
        error?: string;
      };
      if (!saveRes.ok || !saveJson.ok) {
        // Still show generated ideas even if lock failed — warn creator.
        setIdeas(data.ideas);
        setIdeasError(
          saveJson.error ??
            "Ideas generated but couldn't lock them. They may reshuffle if you leave.",
        );
        return;
      }

      setIdeas(saveJson.ideas ?? data.ideas);
      setIdeasLocked(true);
      setIdeasLockedAt(saveJson.lockedAt ?? null);
    } catch (error) {
      setIdeasError(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      setIdeasLoading(false);
    }
  }

  async function regenerateIdea(index: number) {
    if (!selectedPost || regeneratingIndex != null) return;
    setRegeneratingIndex(index);
    setIdeasError(null);
    try {
      const res = await fetch("/api/creator/video-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate_video_idea",
          blogTitle: selectedPost.title,
          bodyMarkdown: selectedPost.bodyMarkdown || selectedPost.bodyPreview,
          replaceIndex: index,
          existingIdeas: ideas,
          scriptPreset,
          post: {
            title: selectedPost.title,
            bodyMarkdown:
              selectedPost.bodyMarkdown || selectedPost.bodyPreview,
            slug: selectedPost.slug,
          },
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        idea?: ShortFormVideoIdea;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.idea) {
        setIdeasError(data.error ?? "Couldn't regenerate that idea.");
        return;
      }

      const saveRes = await fetch("/api/creator/video-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "replace_one",
          postId: selectedPost.id,
          index,
          idea: data.idea,
        }),
      });
      const saveJson = (await saveRes.json()) as {
        ok?: boolean;
        ideas?: ShortFormVideoIdea[];
        lockedAt?: string;
        error?: string;
      };
      if (!saveRes.ok || !saveJson.ok || !saveJson.ideas) {
        // Apply locally even if persistence failed.
        setIdeas((prev) => {
          const next = [...prev];
          next[index] = data.idea!;
          return next;
        });
        setIdeasError(
          saveJson.error ??
            "Replaced locally, but couldn't save the locked set.",
        );
        return;
      }

      setIdeas(saveJson.ideas);
      setIdeasLocked(true);
      setIdeasLockedAt(saveJson.lockedAt ?? null);
    } catch (error) {
      setIdeasError(
        error instanceof Error
          ? error.message
          : "Network error regenerating idea.",
      );
    } finally {
      setRegeneratingIndex(null);
    }
  }

  async function chooseIdea(idea: ShortFormVideoIdea) {
    if (!selectedPost) return;
    setSelectedIdea(idea);
    setPack(null);
    setGrowthPack(null);
    setPackError(null);
    setAssetError(null);
    setProject(null);

    try {
      const res = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_project",
          postId: selectedPost.id,
          postSlug: selectedPost.slug,
          blogTitle: selectedPost.title,
          concept: idea,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        project?: VideoProjectState;
      };
      if (!res.ok || !data.ok || !data.project) {
        setIdeasError(data.error ?? "Couldn't start the video project.");
        return;
      }
      setProject(data.project);
      setPhase("ASSET_COLLECTION");
    } catch (error) {
      setIdeasError(
        error instanceof Error
          ? error.message
          : "Network error starting the video project.",
      );
    }
  }

  async function uploadAsset(
    kind: VideoAssetKind,
    blob: Blob,
    fileName: string,
  ): Promise<VideoAssetReference | null> {
    if (!project) {
      setAssetError("Video project is not ready. Pick the idea again.");
      return null;
    }

    setAssetUploadKind(kind);
    setAssetError(null);
    try {
      const contentType = (
        blob.type ||
        (kind === "voiceover" ? "audio/webm" : "video/mp4")
      )
        .split(";")[0]
        .trim()
        .toLowerCase();
      const ticketRes = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_upload",
          projectId: project.id,
          kind,
          fileName,
          contentType,
          size: blob.size,
        }),
      });
      const ticket = (await ticketRes.json()) as {
        ok: boolean;
        error?: string;
        path?: string;
        token?: string;
      };
      if (!ticketRes.ok || !ticket.ok || !ticket.path || !ticket.token) {
        throw new Error(ticket.error ?? "Could not authorize the upload.");
      }

      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("creator-video-assets")
        .uploadToSignedUrl(ticket.path, ticket.token, blob, {
          contentType,
        });
      if (uploadError) throw uploadError;

      const confirmRes = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_upload",
          projectId: project.id,
          kind,
          path: ticket.path,
          fileName,
          contentType,
          size: blob.size,
        }),
      });
      const confirmed = (await confirmRes.json()) as {
        ok: boolean;
        error?: string;
        project?: VideoProjectState;
        asset?: VideoAssetReference;
      };
      if (
        !confirmRes.ok ||
        !confirmed.ok ||
        !confirmed.project ||
        !confirmed.asset
      ) {
        throw new Error(confirmed.error ?? "Could not confirm the upload.");
      }

      setProject(confirmed.project);
      return confirmed.asset;
    } catch (error) {
      setAssetError(
        error instanceof Error ? error.message : "Media upload failed.",
      );
      return null;
    } finally {
      setAssetUploadKind(null);
    }
  }

  async function onVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file later.
    event.target.value = "";
    if (!file) return;

    // Large clips: offer 720p compress before upload (free plan caps ~50 MB).
    if (file.size >= COMPRESS_OFFER_BYTES) {
      setPendingVideoFile(file);
      setAssetError(null);
      return;
    }

    await applyVideoFile(file);
  }

  async function applyVideoFile(file: File) {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    if (mergedUrl?.startsWith("blob:")) URL.revokeObjectURL(mergedUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setVideoAsset(null);
    setMergedAsset(null);
    setMergedBlob(null);
    setMergedUrl(null);
    setPendingVideoFile(null);
    setCompressProgress(null);

    if (file.size > FREE_PLAN_MAX_UPLOAD_BYTES) {
      setAssetError(
        `This clip is ${formatUploadBytes(file.size)}. Free-plan uploads max out around ${formatUploadBytes(FREE_PLAN_MAX_UPLOAD_BYTES)} — compress to 720p or trim under ~45s first.`,
      );
      return;
    }

    const asset = await uploadAsset("video", file, file.name);
    if (asset) {
      setVideoAsset(asset);
      setVideoUrl(asset.signedUrl);
    }
  }

  async function compressPendingThenUpload() {
    if (!pendingVideoFile || compressing) return;
    setCompressing(true);
    setAssetError(null);
    setCompressProgress({ phase: "loading", ratio: 0 });
    try {
      const { blob, fileName } = await compressVideoTo720p(
        pendingVideoFile,
        setCompressProgress,
      );
      const compressed = new File([blob], fileName, {
        type: blob.type || "video/mp4",
      });
      await applyVideoFile(compressed);
    } catch (error) {
      setAssetError(
        error instanceof Error
          ? error.message
          : "Could not compress that clip in-browser.",
      );
    } finally {
      setCompressing(false);
      setCompressProgress(null);
    }
  }

  async function uploadPendingOriginal() {
    if (!pendingVideoFile) return;
    await applyVideoFile(pendingVideoFile);
  }

  async function toggleRecording() {
    setMicError(null);
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        setRecording(false);
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (audioUrl?.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
        if (mergedUrl?.startsWith("blob:")) URL.revokeObjectURL(mergedUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setVoiceoverAsset(null);
        setMergedAsset(null);
        setMergedBlob(null);
        setMergedUrl(null);

        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const asset = await uploadAsset(
          "voiceover",
          blob,
          `voiceover-${Date.now()}.${extension}`,
        );
        if (asset) {
          setVoiceoverAsset(asset);
          setAudioUrl(asset.signedUrl);
        }
      };

      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (error) {
      setMicError(
        error instanceof Error
          ? error.message
          : "Microphone access was blocked. Allow mic permissions and try again.",
      );
    }
  }

  async function buildProductionPack() {
    if (!selectedPost || !selectedIdea || !project) return;
    setPackLoading(true);
    setPackError(null);

    try {
      const res = await fetch("/api/creator/video-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_social_package",
          blogTitle: selectedPost.title,
          concept: {
            title: selectedIdea.title,
            videoHook: selectedIdea.videoHook,
            shootingConcept: selectedIdea.shootingConcept,
          },
          assetsReady: Boolean(videoAsset || voiceoverAsset || mergedAsset),
          hasVideo: Boolean(videoAsset || mergedAsset),
          hasVoiceOver: Boolean(voiceoverAsset),
          hasMerged: Boolean(mergedAsset),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        package?: VideoSocialPackage;
        pack?: VideoSocialPackage;
      };
      const socialPackage = data.package ?? data.pack;
      if (!res.ok || !data.ok || !socialPackage) {
        setPackError(data.error ?? "Couldn't build the social package.");
        return;
      }
      setPack(socialPackage);

      const saveRes = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_social_package",
          projectId: project.id,
          socialPackage,
          market,
        }),
      });
      const saved = (await saveRes.json()) as {
        ok: boolean;
        error?: string;
        project?: VideoProjectState;
        growthPromoPack?: VideoGrowthPromoPack;
      };
      if (!saveRes.ok || !saved.ok || !saved.project) {
        setPackError(
          saved.error ??
            "Social package was created but could not be synced to the project.",
        );
        return;
      }
      setProject(saved.project);
      setGrowthPack(
        saved.growthPromoPack ?? saved.project.growthPromoPack ?? null,
      );
      setTargetSectionAnchor(saved.project.targetSectionAnchor ?? "");
      setEmbedMessage(null);
      setPhase("PRODUCTION_REVIEW");
      void loadResumeProjects();
    } catch (error) {
      setPackError(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      setPackLoading(false);
    }
  }

  async function runSyncMerge() {
    if (!project || !videoAsset || !voiceoverAsset) {
      setMergeError("Need both a gym clip and a voiceover before syncing.");
      return;
    }
    if (!canLikelyMergeInBrowser()) {
      setMergeError(
        "This browser can't sync in-app. Download both assets from Export and mix in CapCut.",
      );
      return;
    }

    setMergeLoading(true);
    setMergeError(null);
    setMergeProgress({ phase: "loading", ratio: 0 });

    try {
      const videoSource = videoFile ?? videoAsset.signedUrl;
      const voiceSource = audioBlob ?? voiceoverAsset.signedUrl;
      const { blob, fileName } = await mergeVideoWithVoiceover({
        videoSource,
        voiceoverSource: voiceSource,
        onProgress: setMergeProgress,
      });

      if (mergedUrl?.startsWith("blob:")) URL.revokeObjectURL(mergedUrl);
      const previewUrl = URL.createObjectURL(blob);
      setMergedBlob(blob);
      setMergedUrl(previewUrl);

      const asset = await uploadAsset("merged", blob, fileName);
      if (!asset) {
        setMergeError("Synced locally but upload failed. Try Sync again.");
        return;
      }
      setMergedAsset(asset);
      void loadResumeProjects();
    } catch (error) {
      setMergeError(
        error instanceof Error
          ? error.message
          : "Sync failed. Try again or mix in CapCut.",
      );
    } finally {
      setMergeLoading(false);
      setMergeProgress(null);
    }
  }

  function goToSyncOrPack() {
    if (videoAsset && voiceoverAsset) {
      setMergeError(null);
      setPhase("SYNC_MERGE");
      return;
    }
    void buildProductionPack();
  }

  async function saveBlogEmbed() {
    if (!project) return;
    setEmbedSaving(true);
    setEmbedMessage(null);
    try {
      const res = await fetch("/api/creator/video-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_embed",
          projectId: project.id,
          targetSectionAnchor: targetSectionAnchor || null,
          embedPublished: Boolean(targetSectionAnchor),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        project?: VideoProjectState;
      };
      if (!res.ok || !data.ok || !data.project) {
        setEmbedMessage(data.error ?? "Could not save blog embed target.");
        return;
      }
      setProject(data.project);
      setEmbedMessage(
        data.project.embedPublished
          ? "Embed is live under that blog section."
          : targetSectionAnchor
            ? "Section saved. Upload a clip to publish the embed."
            : "Blog embed cleared.",
      );
    } catch (error) {
      setEmbedMessage(
        error instanceof Error ? error.message : "Network error saving embed.",
      );
    } finally {
      setEmbedSaving(false);
    }
  }

  function exportProductionPack() {
    if (!selectedPost || !selectedIdea || !pack) return;

    const lines = [
      `# Vitality Sweat Production Pack`,
      ``,
      `Blog: ${selectedPost.title}`,
      `URL: /blog/${selectedPost.slug}`,
      `Video idea: ${selectedIdea.title}`,
      `Hook: ${selectedIdea.videoHook}`,
      `Shoot: ${selectedIdea.shootingConcept}`,
      ``,
      `## Caption`,
      pack.caption,
      ``,
      `## Thumbnail title overlay`,
      pack.thumbnailTitle,
      ``,
      `## Hashtags`,
      pack.hashtags.join(" "),
      ``,
      `## Distribution SEO`,
      pack.seoMetadata.description,
      `TikTok: ${pack.seoMetadata.tiktok.join(", ") || "—"}`,
      `YouTube Shorts: ${pack.seoMetadata.youtubeShorts.join(", ") || "—"}`,
      `Instagram Reels: ${pack.seoMetadata.instagramReels.join(", ") || "—"}`,
      ``,
      `## Assets`,
      `Project ID: ${project?.id ?? "not synced"}`,
      `Gym clip: ${videoAsset?.path ?? "not attached"}`,
      `Voice over: ${voiceoverAsset?.path ?? "not attached"}`,
      `Synced clip: ${mergedAsset?.path ?? "not synced yet"}`,
      ``,
      `— Generated in Creator Studio Video Wizard`,
    ].join("\n");

    downloadBlob(
      new Blob([lines], { type: "text/markdown;charset=utf-8" }),
      `vitality-sweat-${selectedPost.slug}-production-pack.md`,
    );

    if (mergedBlob) {
      const ext = mergedBlob.type.includes("mp4") ? "mp4" : "webm";
      downloadBlob(mergedBlob, `synced-${selectedPost.slug}.${ext}`);
    } else if (mergedAsset?.signedUrl) {
      void fetch(mergedAsset.signedUrl)
        .then((r) => r.blob())
        .then((blob) =>
          downloadBlob(
            blob,
            mergedAsset.fileName || `synced-${selectedPost.slug}.mp4`,
          ),
        )
        .catch(() => undefined);
    } else {
      if (videoFile) {
        downloadBlob(videoFile, videoFile.name);
      }
      if (audioBlob) {
        const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
        downloadBlob(audioBlob, `voiceover-${selectedPost.slug}.${ext}`);
      }
    }
  }

  function startOver() {
    setPhase("SELECT_BLOG_CONTEXT");
    setSelectedPost(null);
    setIdeas([]);
    setSelectedIdea(null);
    setIdeasError(null);
    setPack(null);
    setGrowthPack(null);
    setPackError(null);
    setMergeError(null);
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    if (audioUrl?.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
    if (mergedUrl?.startsWith("blob:")) URL.revokeObjectURL(mergedUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoAsset(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setVoiceoverAsset(null);
    setMergedBlob(null);
    setMergedUrl(null);
    setMergedAsset(null);
    setProject(null);
    setAssetUploadKind(null);
    setAssetError(null);
    setRecording(false);
    setRecordSeconds(0);
    void loadPosts();
    void loadResumeProjects();
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-24">
      <StepIndicator activeIndex={stepIndex} />

      {phase === "SELECT_BLOG_CONTEXT" ? (
        <section className="space-y-4" aria-label="Step 1: Select blog">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Pick a Chronicle to film
          </h2>
          <p className="font-sans text-sm leading-relaxed text-brand-muted">
            Pulls your latest published posts. Tap one and we&apos;ll spin up 5
            short-form video angles.
          </p>

          <div className="space-y-3 border-2 border-brand-ink/10 bg-surface-elevated p-4">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
              Continue a shoot
            </p>
            {resumeLoading ? (
              <p className="flex items-center gap-2 font-sans text-sm text-brand-muted">
                <Spinner dark /> Loading saved shoots…
              </p>
            ) : null}
            {resumeError ? (
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {resumeError}
              </p>
            ) : null}
            {!resumeLoading && resumeProjects.length === 0 ? (
              <p className="font-sans text-sm text-brand-muted">
                No saved clips yet. Start a new shoot below.
              </p>
            ) : null}
            <ul className="space-y-2">
              {resumeProjects.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={resumingId !== null}
                    onClick={() => void resumeProject(item)}
                    className="w-full border-2 border-brand-ink/10 bg-surface px-4 py-3 text-left transition-colors hover:border-brand-orange disabled:opacity-60"
                  >
                    <span className="block font-display text-base text-brand-ink">
                      {item.conceptTitle || item.blogTitle}
                    </span>
                    <span className="mt-1 block font-sans text-xs text-brand-muted">
                      {item.blogTitle} · {statusLabel(item.status)} ·{" "}
                      {item.hasMerged
                        ? "synced"
                        : item.hasVideo && item.hasVoiceover
                          ? "clip + VO"
                          : item.hasVideo
                            ? "clip only"
                            : "VO only"}
                      {resumingId === item.id ? " · opening…" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
            Or start a new shoot
          </p>

          <fieldset className="space-y-2">
            <legend className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
              Script preset
            </legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScriptPreset("standard")}
                className={`min-h-10 border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] ${
                  scriptPreset === "standard"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setScriptPreset("app_invite")}
                className={`min-h-10 border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] ${
                  scriptPreset === "app_invite"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                App invite
              </button>
            </div>
            {scriptPreset === "app_invite" ? (
              <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-brand-muted">
                {APP_INVITE_SCRIPT_GUIDANCE}
              </p>
            ) : null}
            <label className="block font-sans text-sm text-brand-ink">
              <span className="font-semibold">Market playbook</span>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as MetroId)}
                className="mt-1.5 w-full max-w-xs border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm outline-none focus:border-brand-orange"
              >
                {METROS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.shortLabel}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          {postsLoading ? (
            <p className="flex items-center gap-2 font-sans text-sm text-brand-muted">
              <Spinner dark /> Loading published posts…
            </p>
          ) : null}

          {postsError ? (
            <div className="space-y-3">
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {postsError}
              </p>
              <button
                type="button"
                onClick={() => void loadPosts()}
                className={secondaryButtonClass}
              >
                Retry
              </button>
            </div>
          ) : null}

          {!postsLoading && !postsError && posts.length === 0 ? (
            <p className="border-2 border-dashed border-brand-ink/20 bg-surface p-4 font-sans text-sm leading-relaxed text-brand-muted">
              No published posts yet. Finish one in the Blog Wizard, then come
              back here to film it.
            </p>
          ) : null}

          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => void selectBlog(post)}
                  className="block w-full border-2 border-brand-ink/15 bg-surface-elevated p-4 text-left transition-colors hover:border-brand-orange focus:border-brand-orange focus:outline-none active:border-brand-orange"
                >
                  <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
                    {formatDate(post.publishedAt)}
                  </p>
                  <p className="mt-1 font-display text-lg leading-snug text-brand-ink">
                    {post.title}
                  </p>
                  <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-brand-muted">
                    {post.excerpt}
                  </p>
                  <span className="mt-3 inline-block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
                    Open video ideas →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {phase === "VIDEO_IDEAS_DISPLAY" ? (
        <section className="space-y-4" aria-label="Step 2: Video ideas">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Short-form angles
          </h2>
          {selectedPost ? (
            <p className="border-l-4 border-brand-orange bg-brand-orange/5 px-3 py-2 font-sans text-sm leading-snug text-brand-ink">
              From: <span className="font-semibold">{selectedPost.title}</span>
            </p>
          ) : null}

          {ideasLocked && !ideasLoading ? (
            <p className="border border-brand-ink/10 bg-surface-elevated px-3 py-2 font-sans text-sm text-brand-muted">
              Locked in
              {ideasLockedAt
                ? ` · ${formatDate(ideasLockedAt)}`
                : ""}. These five stay put when you leave — reject one to swap
              just that slot.
            </p>
          ) : null}

          {ideasLoading ? (
            <p className="flex items-center gap-2 font-sans text-sm text-brand-muted">
              <Spinner dark /> Loading video ideas…
            </p>
          ) : null}

          {ideasError ? (
            <div className="space-y-3">
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {ideasError}
              </p>
              {selectedPost && !ideas.length ? (
                <button
                  type="button"
                  onClick={() => void selectBlog(selectedPost)}
                  className={secondaryButtonClass}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            {ideas.map((idea, index) => (
              <article
                key={`${index}-${idea.title}`}
                className="border-2 border-brand-ink/15 bg-surface-elevated p-4"
              >
                <p className="font-display text-lg leading-snug text-brand-ink">
                  {idea.title}
                </p>
                {idea.videoHook ? (
                  <p className="mt-2 font-sans text-sm italic leading-relaxed text-brand-muted">
                    “{idea.videoHook}”
                  </p>
                ) : null}
                {idea.shootingConcept ? (
                  <p className="mt-3 font-sans text-sm leading-snug text-brand-ink">
                    <span className="font-bold text-brand-orange">Shoot: </span>
                    {idea.shootingConcept}
                  </p>
                ) : null}
                {idea.scriptBeats ? (
                  <ol className="mt-3 space-y-1 border border-brand-ink/10 bg-surface px-3 py-2 font-sans text-xs leading-relaxed text-brand-ink">
                    <li>
                      <span className="font-bold text-brand-orange">Hook: </span>
                      {idea.scriptBeats.hook}
                    </li>
                    <li>
                      <span className="font-bold text-brand-orange">Tip: </span>
                      {idea.scriptBeats.tip}
                    </li>
                    <li>
                      <span className="font-bold text-brand-orange">CTA: </span>
                      {idea.scriptBeats.cta}
                    </li>
                  </ol>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void chooseIdea(idea)}
                    disabled={regeneratingIndex != null}
                    className="inline-flex min-h-12 flex-1 items-center justify-center bg-brand-orange px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
                  >
                    Film this one →
                  </button>
                  <button
                    type="button"
                    onClick={() => void regenerateIdea(index)}
                    disabled={regeneratingIndex != null}
                    className="inline-flex min-h-12 flex-1 items-center justify-center border-2 border-brand-ink/20 bg-surface px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
                  >
                    {regeneratingIndex === index ? (
                      <span className="flex items-center gap-2">
                        <Spinner dark /> Regenerating…
                      </span>
                    ) : (
                      "Reject & regenerate"
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPhase("SELECT_BLOG_CONTEXT")}
            className={secondaryButtonClass}
          >
            ← Pick a different blog
          </button>
        </section>
      ) : null}

      {phase === "ASSET_COLLECTION" && selectedIdea ? (
        <section className="space-y-4" aria-label="Step 3: Collect assets">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Grab your assets
          </h2>
          <p className="border-l-4 border-brand-orange bg-brand-orange/5 px-3 py-2 font-display text-base leading-snug text-brand-ink">
            {selectedIdea.title}
          </p>
          <p className="font-sans text-sm leading-relaxed text-brand-muted">
            Upload a gym clip and drop a quick voice-over. Then we&apos;ll build
            the caption pack.
          </p>

          <div className="space-y-3">
            <div className="flex min-h-36 flex-col items-center justify-center gap-3 border-2 border-dashed border-brand-ink/25 bg-surface px-4 py-6 text-center">
              <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
                Gym video clip
              </span>
              <span className="font-sans text-sm text-brand-muted">
                Pick a video from Photos (under ~45s / 720p stays under the
                upload limit). Large clips get a compress option first.
              </span>
              <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                <label
                  htmlFor={videoInputId}
                  className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center bg-brand-orange px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
                >
                  Choose from Photos
                </label>
                <label
                  htmlFor={videoCameraInputId}
                  className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center border-2 border-brand-ink/20 bg-surface-elevated px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
                >
                  Record with camera
                </label>
              </div>
              {videoFile ? (
                <span className="font-sans text-xs font-semibold text-brand-ink">
                  {videoFile.name} · {formatBytes(videoFile.size)}
                </span>
              ) : null}
              {assetUploadKind === "video" ? (
                <span className="flex items-center gap-2 font-sans text-xs text-brand-orange">
                  <Spinner dark /> Uploading securely…
                </span>
              ) : videoAsset ? (
                <span className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-green-700">
                  Secure upload complete
                </span>
              ) : null}
            </div>
            {/* No capture attr — iOS opens Photos / Files instead of forcing Camera. */}
            <input
              id={videoInputId}
              type="file"
              accept="video/*,.mov,.mp4,.m4v"
              className="sr-only"
              onChange={onVideoChange}
            />
            <input
              id={videoCameraInputId}
              type="file"
              accept="video/*"
              capture="environment"
              className="sr-only"
              onChange={onVideoChange}
            />

            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-[9/16] max-h-[50vh] w-full bg-surface-dark object-contain"
              />
            ) : null}

            {assetError ? (
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {assetError}
              </p>
            ) : null}

            {pendingVideoFile ? (
              <div
                className="space-y-3 border-2 border-brand-orange/40 bg-brand-orange/5 p-4"
                role="dialog"
                aria-label="Compress video before upload"
              >
                <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
                  Large clip
                </p>
                <p className="font-display text-lg text-brand-ink">
                  {pendingVideoFile.name}
                </p>
                <p className="font-sans text-sm leading-relaxed text-brand-muted">
                  This file is{" "}
                  <span className="font-semibold text-brand-ink">
                    {formatUploadBytes(pendingVideoFile.size)}
                  </span>
                  . Free-plan uploads max around{" "}
                  {formatUploadBytes(FREE_PLAN_MAX_UPLOAD_BYTES)}. Want to
                  convert to ~720p in the app before uploading?
                </p>

                {compressing ? (
                  <p className="flex items-center gap-2 font-sans text-sm text-brand-muted">
                    <Spinner dark />
                    {compressProgress?.phase === "loading"
                      ? "Reading clip…"
                      : `Compressing to 720p… ${Math.round((compressProgress?.ratio ?? 0) * 100)}%`}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={compressing || !canLikelyCompressInBrowser()}
                    onClick={() => void compressPendingThenUpload()}
                    className="inline-flex min-h-12 flex-1 items-center justify-center bg-brand-orange px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
                  >
                    Compress to 720p &amp; upload
                  </button>
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => void uploadPendingOriginal()}
                    className="inline-flex min-h-12 flex-1 items-center justify-center border-2 border-brand-ink/20 bg-surface px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
                  >
                    Upload original
                  </button>
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => {
                      setPendingVideoFile(null);
                      setCompressProgress(null);
                    }}
                    className="inline-flex min-h-12 items-center justify-center px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-muted hover:text-brand-orange disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>

                {!canLikelyCompressInBrowser() ? (
                  <p className="font-sans text-xs leading-relaxed text-brand-muted">
                    In-app compress isn&apos;t available in this browser. On
                    iPhone: Settings → Camera → Record Video → 720p HD, or trim
                    in Photos / export from CapCut at 720p, then choose the
                    smaller file here.
                  </p>
                ) : (
                  <p className="font-sans text-xs leading-relaxed text-brand-muted">
                    Tip: keep the final cut under ~45 seconds. If compress fails
                    on iPhone Safari, set Camera to 720p HD or export 720p from
                    CapCut / Photos, then re-upload.
                  </p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void toggleRecording()}
              className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 border-2 px-4 py-6 text-center transition-colors ${
                recording
                  ? "border-red-600 bg-red-50"
                  : "border-dashed border-brand-ink/25 bg-surface hover:border-brand-orange"
              }`}
            >
              <span
                className={`font-sans text-xs font-bold uppercase tracking-[0.14em] ${
                  recording ? "text-red-700" : "text-brand-orange"
                }`}
              >
                {recording
                  ? `Recording… ${recordSeconds}s — tap to stop`
                  : "Record Voice Over narration"}
              </span>
              <span className="font-sans text-sm text-brand-muted">
                Uses your phone mic · keep it under 45s
              </span>
              {audioBlob && !recording ? (
                <span className="font-sans text-xs font-semibold text-brand-ink">
                  Voice-over ready · {formatBytes(audioBlob.size)}
                </span>
              ) : null}
              {assetUploadKind === "voiceover" ? (
                <span className="flex items-center gap-2 font-sans text-xs text-brand-orange">
                  <Spinner dark /> Uploading securely…
                </span>
              ) : voiceoverAsset ? (
                <span className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-green-700">
                  Secure upload complete
                </span>
              ) : null}
            </button>

            {micError ? (
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {micError}
              </p>
            ) : null}

            {audioUrl ? (
              <audio src={audioUrl} controls className="w-full" />
            ) : null}
          </div>

          {packError ? (
            <p
              className="font-sans text-sm font-semibold text-red-700"
              role="alert"
            >
              {packError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => goToSyncOrPack()}
            disabled={
              packLoading ||
              assetUploadKind !== null ||
              (!videoAsset && !voiceoverAsset)
            }
            className={bigButtonClass}
          >
            {packLoading ? (
              <>
                <Spinner />
                Building caption pack…
              </>
            ) : videoAsset && voiceoverAsset ? (
              "Sync clip + voiceover →"
            ) : (
              "Build Production Pack"
            )}
          </button>
          <p className="text-center font-sans text-xs text-brand-muted">
            {videoAsset && voiceoverAsset
              ? "Next: mute gym audio and lay your voiceover under the picture."
              : "Need at least one completed secure upload to continue."}
            {project ? ` Project ${project.id.slice(0, 8)} is saved.` : ""}
          </p>
          <button
            type="button"
            onClick={() => setPhase("VIDEO_IDEAS_DISPLAY")}
            disabled={packLoading || recording}
            className={secondaryButtonClass}
          >
            ← Pick a different idea
          </button>
        </section>
      ) : null}

      {phase === "SYNC_MERGE" && selectedPost && selectedIdea ? (
        <section className="space-y-5" aria-label="Step 4: Sync clip and voiceover">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Sync clip + voiceover
          </h2>
          <p className="font-sans text-sm leading-relaxed text-brand-muted">
            We mute the gym mic and lay your narration under the picture — no
            CapCut required. Keep the phone awake while it encodes.
          </p>

          <div className="border-2 border-brand-ink/10 bg-surface-elevated p-4">
            <ul className="space-y-2 font-sans text-sm text-brand-ink">
              <li>
                <span className="font-bold">Clip: </span>
                {videoAsset ? videoAsset.fileName : "Missing"}
              </li>
              <li>
                <span className="font-bold">Voiceover: </span>
                {voiceoverAsset
                  ? `Ready (${formatBytes(voiceoverAsset.size)})`
                  : "Missing"}
              </li>
              <li>
                <span className="font-bold">Synced: </span>
                {mergedAsset
                  ? `${mergedAsset.fileName} · saved`
                  : "Not created yet"}
              </li>
            </ul>
          </div>

          {mergedUrl ? (
            <video
              src={mergedUrl}
              controls
              playsInline
              className="aspect-[9/16] max-h-[50vh] w-full bg-surface-dark object-contain"
            />
          ) : null}

          {mergeLoading ? (
            <p className="flex items-center gap-2 font-sans text-sm text-brand-muted">
              <Spinner dark />
              {mergeProgress?.phase === "loading"
                ? "Loading clip + voiceover…"
                : `Syncing… ${Math.round((mergeProgress?.ratio ?? 0) * 100)}%`}
            </p>
          ) : null}

          {mergeError ? (
            <p
              className="font-sans text-sm font-semibold text-red-700"
              role="alert"
            >
              {mergeError}
            </p>
          ) : null}

          {!canLikelyMergeInBrowser() ? (
            <p className="font-sans text-sm text-brand-muted">
              In-app sync isn&apos;t available here. Skip to captions and mix in
              CapCut on your phone.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void runSyncMerge()}
            disabled={
              mergeLoading ||
              assetUploadKind !== null ||
              !videoAsset ||
              !voiceoverAsset ||
              !canLikelyMergeInBrowser()
            }
            className={bigButtonClass}
          >
            {mergeLoading ? (
              <>
                <Spinner />
                Syncing…
              </>
            ) : mergedAsset ? (
              "Re-sync clip"
            ) : (
              "Sync now"
            )}
          </button>

          <button
            type="button"
            onClick={() => void buildProductionPack()}
            disabled={packLoading || mergeLoading || assetUploadKind !== null}
            className={bigButtonClass}
          >
            {packLoading ? (
              <>
                <Spinner />
                Building caption pack…
              </>
            ) : mergedAsset ? (
              "Build Production Pack →"
            ) : (
              "Skip sync · Build captions"
            )}
          </button>

          <button
            type="button"
            onClick={() => setPhase("ASSET_COLLECTION")}
            disabled={mergeLoading || packLoading}
            className={secondaryButtonClass}
          >
            ← Back to assets
          </button>
        </section>
      ) : null}

      {phase === "PRODUCTION_REVIEW" &&
      selectedPost &&
      selectedIdea &&
      pack ? (
        <section className="space-y-5" aria-label="Step 4: Production review">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Production review
          </h2>

          <div className="border-2 border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
            <p className="eyebrow text-brand-orange">Compiled assets</p>
            <ul className="mt-3 space-y-2 font-sans text-sm text-brand-ink">
              <li>
                <span className="font-bold">Blog: </span>
                {selectedPost.title}
              </li>
              <li>
                <span className="font-bold">Idea: </span>
                {selectedIdea.title}
              </li>
              <li>
                <span className="font-bold">Clip: </span>
                {videoAsset
                  ? `${videoAsset.fileName} (${formatBytes(videoAsset.size)}) · secure`
                  : "Not attached"}
              </li>
              <li>
                <span className="font-bold">Voice-over: </span>
                {voiceoverAsset
                  ? `Recorded (${formatBytes(voiceoverAsset.size)}) · secure`
                  : "Not attached"}
              </li>
              <li>
                <span className="font-bold">Synced: </span>
                {mergedAsset
                  ? `${mergedAsset.fileName} · ready to post`
                  : "Not synced"}
              </li>
            </ul>
            {mergedUrl ? (
              <video
                src={mergedUrl}
                controls
                playsInline
                className="mt-4 aspect-[9/16] max-h-[40vh] w-full bg-surface-dark object-contain"
              />
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="mt-4 aspect-[9/16] max-h-[40vh] w-full bg-surface-dark object-contain"
              />
            ) : null}
            {!mergedUrl && audioUrl ? (
              <audio src={audioUrl} controls className="mt-3 w-full" />
            ) : null}
          </div>

          <div className="border-2 border-brand-ink/10 bg-surface p-4 sm:p-5">
            <p className="eyebrow text-brand-orange">Caption &amp; hashtags</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-brand-ink">
              {pack.caption}
            </pre>
            <p className="mt-4 font-sans text-sm font-semibold text-brand-orange">
              {pack.hashtags.join(" ")}
            </p>
          </div>

          {growthPack ? (
            <div className="border-2 border-brand-orange/40 bg-brand-orange/5 p-4 sm:p-5">
              <p className="eyebrow text-brand-orange">
                Growth packaging applied
              </p>
              <ul className="mt-2 space-y-1 font-sans text-sm text-brand-ink">
                <li>✓ Caption variants (IG / FB / YouTube Shorts) with free signup CTA</li>
                <li>✓ Pinned comment + description with app link</li>
                <li>✓ Companion Chronicles draft title/prompt</li>
              </ul>

              {(
                [
                  ["ig", "Instagram caption", growthPack.captionVariants.instagram],
                  ["fb", "Facebook caption", growthPack.captionVariants.facebook],
                  [
                    "yt",
                    "YouTube Shorts",
                    growthPack.captionVariants.youtubeShorts,
                  ],
                  ["pin", "Pinned comment", growthPack.pinnedComment],
                  [
                    "desc",
                    "Description + app link",
                    growthPack.descriptionWithAppLink,
                  ],
                  [
                    "companion",
                    "Companion post prompt",
                    `${growthPack.companionPostTitle}\n\n${growthPack.companionPostPrompt}`,
                  ],
                ] as const
              ).map(([key, label, text]) => (
                <div
                  key={key}
                  className="mt-4 border border-brand-ink/10 bg-surface px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-muted">
                      {label}
                    </p>
                    <button
                      type="button"
                      className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(text);
                          setCopiedGrowthKey(key);
                          window.setTimeout(
                            () => setCopiedGrowthKey(null),
                            1600,
                          );
                        } catch {
                          setCopiedGrowthKey(null);
                        }
                      }}
                    >
                      {copiedGrowthKey === key ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-brand-ink">
                    {text}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}

          <div className="border-2 border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
            <p className="eyebrow text-brand-orange">Thumbnail overlay</p>
            <p className="mt-3 font-display text-2xl leading-tight text-brand-ink">
              {pack.thumbnailTitle || "—"}
            </p>
          </div>

          <div className="border-2 border-brand-ink/10 bg-surface p-4 sm:p-5">
            <p className="eyebrow text-brand-orange">Distribution SEO</p>
            {pack.seoMetadata.description ? (
              <p className="mt-3 font-sans text-sm leading-relaxed text-brand-ink">
                {pack.seoMetadata.description}
              </p>
            ) : null}
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-muted">
                  TikTok
                </dt>
                <dd className="mt-0.5 font-sans text-sm text-brand-ink">
                  {pack.seoMetadata.tiktok.join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-muted">
                  YouTube Shorts
                </dt>
                <dd className="mt-0.5 font-sans text-sm text-brand-ink">
                  {pack.seoMetadata.youtubeShorts.join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-muted">
                  Instagram Reels
                </dt>
                <dd className="mt-0.5 font-sans text-sm text-brand-ink">
                  {pack.seoMetadata.instagramReels.join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-2 border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
            <p className="eyebrow text-brand-orange">Target blog section</p>
            <p className="mt-2 font-sans text-sm text-brand-muted">
              Inject this clip under a heading on the live Chronicle once media
              is uploaded.
            </p>
            <label
              htmlFor="video-target-section"
              className="mt-4 block font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-muted"
            >
              Target Blog Section
            </label>
            <select
              id="video-target-section"
              className="mt-1.5 min-h-12 w-full border border-brand-ink/15 bg-surface px-3 font-sans text-sm text-brand-ink disabled:opacity-50"
              value={targetSectionAnchor}
              disabled={sectionOptions.length === 0 || embedSaving}
              onChange={(e) => setTargetSectionAnchor(e.target.value)}
            >
              <option value="">
                {sectionOptions.length === 0
                  ? "No headings found in this post"
                  : "Select a section…"}
              </option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.level === 3 ? "— " : ""}
                  {section.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`${secondaryButtonClass} mt-3`}
              disabled={embedSaving || !project}
              onClick={() => void saveBlogEmbed()}
            >
              {embedSaving ? (
                <>
                  <Spinner dark /> Saving…
                </>
              ) : (
                "Save blog embed target"
              )}
            </button>
            {embedMessage ? (
              <p className="mt-2 font-sans text-sm text-brand-ink">
                {embedMessage}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={exportProductionPack}
            className={bigButtonClass}
          >
            Download / Export Production Pack
          </button>
          <p className="text-center font-sans text-xs text-brand-muted">
            Downloads a caption brief plus your synced clip (or separate assets)
            for manual posting.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setPhase(
                  videoAsset && voiceoverAsset
                    ? "SYNC_MERGE"
                    : "ASSET_COLLECTION",
                )
              }
              className={secondaryButtonClass}
            >
              ← {videoAsset && voiceoverAsset ? "Sync" : "Assets"}
            </button>
            <button
              type="button"
              onClick={startOver}
              className={secondaryButtonClass}
            >
              New shoot
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <ol
      className="flex items-start justify-between gap-1"
      aria-label={`Step ${activeIndex + 1} of ${PHASE_ORDER.length}: ${PHASE_LABELS[PHASE_ORDER[activeIndex]]}`}
    >
      {PHASE_ORDER.map((phase, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li
            key={phase}
            className="flex flex-1 flex-col items-center gap-1.5"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full font-sans text-sm font-bold ${
                done
                  ? "bg-brand-orange text-white"
                  : active
                    ? "border-[3px] border-brand-orange bg-surface text-brand-orange"
                    : "border-2 border-brand-ink/20 bg-surface text-brand-muted"
              }`}
              aria-hidden
            >
              {done ? "✓" : index + 1}
            </span>
            <span
              className={`text-center font-sans text-[0.62rem] font-bold uppercase tracking-[0.1em] ${
                active ? "text-brand-orange" : "text-brand-muted"
              }`}
            >
              {PHASE_LABELS[phase]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
