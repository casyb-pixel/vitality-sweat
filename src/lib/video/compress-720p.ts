/** Soft warn / free-plan hard ceiling for gym clip uploads. */
export const FREE_PLAN_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const COMPRESS_OFFER_BYTES = 40 * 1024 * 1024;
export const TARGET_720P_HEIGHT = 720;
/** ~2.5 Mbps keeps a 45s 720p clip well under 50 MB. */
export const TARGET_VIDEO_BITRATE = 2_500_000;

export type CompressProgress = {
  phase: "loading" | "encoding" | "done";
  /** 0–1 while encoding. */
  ratio: number;
};

function pickRecorderMime(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(c.mimeType)
    ) {
      return c;
    }
  }
  return { mimeType: "", extension: "webm" };
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;
    video.src = url;

    const cleanupFail = (err: Error) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    video.onloadedmetadata = () => {
      // iOS sometimes reports Infinity duration until a seek.
      if (!Number.isFinite(video.duration) || video.duration === 0) {
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          video.currentTime = 0;
          resolve(video);
        };
        return;
      }
      resolve(video);
    };
    video.onerror = () =>
      cleanupFail(new Error("Could not read that video on this device."));
  });
}

/**
 * Re-encode a gym clip to ~720p in the browser before upload.
 * Uses canvas + MediaRecorder (works on many phones; Safari can be flaky).
 */
export async function compressVideoTo720p(
  file: File,
  onProgress?: (progress: CompressProgress) => void,
): Promise<{ blob: Blob; fileName: string }> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "This browser cannot compress video in-app. Trim/export at 720p on your phone, then upload.",
    );
  }

  onProgress?.({ phase: "loading", ratio: 0 });
  const video = await loadVideo(file);
  const srcUrl = video.src;

  try {
    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    const scale = Math.min(1, TARGET_720P_HEIGHT / Math.max(srcW, srcH));
    const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available for compression.");

    const canvasStream = canvas.captureStream(30);
    // Prefer audio from the source when the browser exposes captureStream.
    try {
      const media = (
        video as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        }
      ).captureStream?.() ??
        (
          video as HTMLVideoElement & {
            mozCaptureStream?: () => MediaStream;
          }
        ).mozCaptureStream?.();
      const audioTracks = media?.getAudioTracks?.() ?? [];
      for (const track of audioTracks) {
        canvasStream.addTrack(track);
      }
    } catch {
      // Silent video is still usable for gym clips.
    }

    const { mimeType, extension } = pickRecorderMime();
    const recorder = mimeType
      ? new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: TARGET_VIDEO_BITRATE,
        })
      : new MediaRecorder(canvasStream, {
          videoBitsPerSecond: TARGET_VIDEO_BITRATE,
        });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () =>
        reject(new Error("Compression failed while encoding."));
      recorder.onstop = () => {
        resolve(
          new Blob(chunks, {
            type: recorder.mimeType || mimeType || "video/webm",
          }),
        );
      };
    });

    onProgress?.({ phase: "encoding", ratio: 0 });
    recorder.start(250);

    await video.play().catch(() => {
      // Some browsers need an explicit play after mute.
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    await new Promise<void>((resolve, reject) => {
      const draw = () => {
        if (video.ended || video.paused) {
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        if (duration > 0) {
          onProgress?.({
            phase: "encoding",
            ratio: Math.min(0.99, video.currentTime / duration),
          });
        }
        requestAnimationFrame(draw);
      };

      video.onended = () => resolve();
      video.onerror = () => reject(new Error("Playback failed during compression."));
      requestAnimationFrame(draw);
    });

    // Final frame
    ctx.drawImage(video, 0, 0, width, height);
    if (recorder.state === "recording") recorder.stop();
    canvasStream.getTracks().forEach((t) => t.stop());

    const blob = await recorded;
    if (blob.size < 1024) {
      throw new Error(
        "Compression produced an empty file. Export at 720p on your phone and try again.",
      );
    }

    onProgress?.({ phase: "done", ratio: 1 });
    const base = file.name.replace(/\.[^.]+$/, "") || "gym-clip";
    return {
      blob,
      fileName: `${base}-720p.${extension}`,
    };
  } finally {
    video.pause();
    URL.revokeObjectURL(srcUrl);
  }
}

export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function canLikelyCompressInBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}
