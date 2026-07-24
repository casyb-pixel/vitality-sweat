"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type {
  CreatorPublishedPost,
  ShortFormVideoIdea,
  VideoAssetKind,
  VideoAssetReference,
  VideoProjectState,
  VideoSocialPackage,
  VideoStudioPhase,
} from "@/lib/video/video-studio";
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";

const PHASE_ORDER: VideoStudioPhase[] = [
  "SELECT_BLOG_CONTEXT",
  "VIDEO_IDEAS_DISPLAY",
  "ASSET_COLLECTION",
  "PRODUCTION_REVIEW",
];

const PHASE_LABELS: Record<VideoStudioPhase, string> = {
  SELECT_BLOG_CONTEXT: "Pick blog",
  VIDEO_IDEAS_DISPLAY: "Pick idea",
  ASSET_COLLECTION: "Assets",
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

export default function VideoWizard() {
  const videoInputId = useId();
  const [phase, setPhase] = useState<VideoStudioPhase>("SELECT_BLOG_CONTEXT");

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
  const [project, setProject] = useState<VideoProjectState | null>(null);
  const [assetUploadKind, setAssetUploadKind] =
    useState<VideoAssetKind | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
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

  const stepIndex = PHASE_ORDER.indexOf(phase);

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

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [videoUrl, audioUrl]);

  async function selectBlog(post: CreatorPublishedPost) {
    setSelectedPost(post);
    setSelectedIdea(null);
    setIdeas([]);
    setIdeasError(null);
    setIdeasLoading(true);
    setPhase("VIDEO_IDEAS_DISPLAY");

    try {
      const res = await fetch("/api/creator/video-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_video_ideas",
          blogTitle: post.title,
          bodyMarkdown: post.bodyMarkdown || post.bodyPreview,
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
      setIdeas(data.ideas);
    } catch (error) {
      setIdeasError(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      setIdeasLoading(false);
    }
  }

  async function chooseIdea(idea: ShortFormVideoIdea) {
    if (!selectedPost) return;
    setSelectedIdea(idea);
    setPack(null);
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
        blob.type || (kind === "video" ? "video/mp4" : "audio/webm")
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
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setVideoAsset(null);

    const asset = await uploadAsset("video", file, file.name);
    if (asset) {
      setVideoAsset(asset);
      setVideoUrl(asset.signedUrl);
    }
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
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setVoiceoverAsset(null);

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
          assetsReady: Boolean(videoAsset || voiceoverAsset),
          hasVideo: Boolean(videoAsset),
          hasVoiceOver: Boolean(voiceoverAsset),
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
        }),
      });
      const saved = (await saveRes.json()) as {
        ok: boolean;
        error?: string;
        project?: VideoProjectState;
      };
      if (!saveRes.ok || !saved.ok || !saved.project) {
        setPackError(
          saved.error ??
            "Social package was created but could not be synced to the project.",
        );
        return;
      }
      setProject(saved.project);
      setPhase("PRODUCTION_REVIEW");
    } catch (error) {
      setPackError(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      setPackLoading(false);
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
      ``,
      `— Generated in Creator Studio Video Wizard`,
    ].join("\n");

    downloadBlob(
      new Blob([lines], { type: "text/markdown;charset=utf-8" }),
      `vitality-sweat-${selectedPost.slug}-production-pack.md`,
    );

    if (videoFile) {
      downloadBlob(videoFile, videoFile.name);
    }
    if (audioBlob) {
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      downloadBlob(audioBlob, `voiceover-${selectedPost.slug}.${ext}`);
    }
  }

  function startOver() {
    setPhase("SELECT_BLOG_CONTEXT");
    setSelectedPost(null);
    setIdeas([]);
    setSelectedIdea(null);
    setIdeasError(null);
    setPack(null);
    setPackError(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoAsset(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setVoiceoverAsset(null);
    setProject(null);
    setAssetUploadKind(null);
    setAssetError(null);
    setRecording(false);
    setRecordSeconds(0);
    void loadPosts();
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
                    Generate video ideas →
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

          {ideasLoading ? (
            <p className="flex items-center gap-2 font-sans text-sm text-brand-muted">
              <Spinner dark /> Writing 5 high-impact clip ideas…
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
              {selectedPost ? (
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
            {ideas.map((idea) => (
              <button
                key={idea.title}
                type="button"
                onClick={() => chooseIdea(idea)}
                className="block w-full border-2 border-brand-ink/15 bg-surface-elevated p-4 text-left transition-colors hover:border-brand-orange focus:border-brand-orange focus:outline-none"
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
                <span className="mt-3 inline-block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
                  Film this one →
                </span>
              </button>
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
            <label
              htmlFor={videoInputId}
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-ink/25 bg-surface px-4 py-6 text-center transition-colors hover:border-brand-orange"
            >
              <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
                Upload Gym Video Clip
              </span>
              <span className="font-sans text-sm text-brand-muted">
                Camera roll or record now · vertical preferred
              </span>
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
            </label>
            <input
              id={videoInputId}
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

            {micError || assetError ? (
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {micError ?? assetError}
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
            onClick={() => void buildProductionPack()}
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
            ) : (
              "Build Production Pack"
            )}
          </button>
          <p className="text-center font-sans text-xs text-brand-muted">
            Need at least one completed secure upload to continue.
            {project ? ` Project ${project.id.slice(0, 8)} is synced.` : ""}
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
            </ul>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="mt-4 aspect-[9/16] max-h-[40vh] w-full bg-surface-dark object-contain"
              />
            ) : null}
            {audioUrl ? (
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

          <button
            type="button"
            onClick={exportProductionPack}
            className={bigButtonClass}
          >
            Download / Export Production Pack
          </button>
          <p className="text-center font-sans text-xs text-brand-muted">
            Downloads a caption brief plus your clip and voice-over for manual
            posting.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPhase("ASSET_COLLECTION")}
              className={secondaryButtonClass}
            >
              ← Assets
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
