/**
 * Browser sync: mute gym-clip audio and lay Hunter's voiceover under the picture.
 * Uses canvas + Web Audio + MediaRecorder (same family as compress-720p).
 */

export type MergeProgress = {
  phase: "loading" | "encoding" | "done";
  /** 0–1 while encoding. */
  ratio: number;
};

const TARGET_BITRATE = 2_500_000;

function pickRecorderMime(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
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

async function blobToObjectUrl(source: Blob | string): Promise<{
  url: string;
  revoke: boolean;
}> {
  if (typeof source === "string") {
    return { url: source, revoke: false };
  }
  return { url: URL.createObjectURL(source), revoke: true };
}

function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true; // gym audio intentionally discarded (VO replaces it)
    video.crossOrigin = "anonymous";
    video.src = url;

    video.onloadedmetadata = () => {
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
      reject(new Error("Could not read the gym clip for sync."));
  });
}

function loadAudioElement(url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.src = url;
    audio.onloadedmetadata = () => resolve(audio);
    audio.onerror = () =>
      reject(new Error("Could not read the voiceover for sync."));
  });
}

/**
 * Sync picture from `videoSource` with narration from `voiceoverSource`.
 * Gym-clip microphone audio is muted / omitted — voiceover replaces it.
 */
export async function mergeVideoWithVoiceover(input: {
  videoSource: Blob | string;
  voiceoverSource: Blob | string;
  onProgress?: (progress: MergeProgress) => void;
}): Promise<{ blob: Blob; fileName: string }> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "This browser cannot sync video in-app. Download the clip and VO, then mix in CapCut.",
    );
  }
  const AudioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  if (
    typeof AudioContext === "undefined" &&
    typeof AudioWindow.webkitAudioContext === "undefined"
  ) {
    throw new Error("Web Audio is not available for voiceover sync on this device.");
  }

  input.onProgress?.({ phase: "loading", ratio: 0 });

  const videoRef = await blobToObjectUrl(input.videoSource);
  const audioRef = await blobToObjectUrl(input.voiceoverSource);
  let video: HTMLVideoElement | null = null;
  let audio: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;

  try {
    video = await loadVideoElement(videoRef.url);
    audio = await loadAudioElement(audioRef.url);

    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    const scale = Math.min(1, 720 / Math.max(srcW, srcH));
    const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available for sync.");

    const canvasStream = canvas.captureStream(30);

    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      throw new Error("Web Audio is not available for voiceover sync on this device.");
    }
    audioCtx = new AudioCtx();
    const destination = audioCtx.createMediaStreamDestination();
    const voiceSource = audioCtx.createMediaElementSource(audio);
    voiceSource.connect(destination);
    // Do not connect gym video audio — VO replaces it.

    for (const track of destination.stream.getAudioTracks()) {
      canvasStream.addTrack(track);
    }

    const { mimeType, extension } = pickRecorderMime();
    const recorder = mimeType
      ? new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: TARGET_BITRATE,
        })
      : new MediaRecorder(canvasStream, {
          videoBitsPerSecond: TARGET_BITRATE,
        });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () =>
        reject(new Error("Sync failed while encoding the merged clip."));
      recorder.onstop = () => {
        resolve(
          new Blob(chunks, {
            type: recorder.mimeType || mimeType || "video/webm",
          }),
        );
      };
    });

    input.onProgress?.({ phase: "encoding", ratio: 0 });
    if (audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => undefined);
    }

    video.currentTime = 0;
    audio.currentTime = 0;
    recorder.start(250);

    await Promise.all([
      video.play().catch(() => undefined),
      audio.play().catch(() => undefined),
    ]);

    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    await new Promise<void>((resolve, reject) => {
      const draw = () => {
        if (!video) {
          resolve();
          return;
        }
        if (video.ended || video.paused) {
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        if (duration > 0) {
          input.onProgress?.({
            phase: "encoding",
            ratio: Math.min(0.99, video.currentTime / duration),
          });
        }
        requestAnimationFrame(draw);
      };

      video!.onended = () => resolve();
      video!.onerror = () =>
        reject(new Error("Playback failed while syncing the clip."));
      requestAnimationFrame(draw);
    });

    ctx.drawImage(video, 0, 0, width, height);
    audio.pause();
    if (recorder.state === "recording") recorder.stop();
    canvasStream.getTracks().forEach((t) => t.stop());

    const blob = await recorded;
    if (blob.size < 1024) {
      throw new Error(
        "Sync produced an empty file. Try again, or mix in CapCut on your phone.",
      );
    }

    input.onProgress?.({ phase: "done", ratio: 1 });
    return {
      blob,
      fileName: `synced-clip-${Date.now()}.${extension}`,
    };
  } finally {
    video?.pause();
    audio?.pause();
    void audioCtx?.close().catch(() => undefined);
    if (videoRef.revoke) URL.revokeObjectURL(videoRef.url);
    if (audioRef.revoke) URL.revokeObjectURL(audioRef.url);
  }
}

export function canLikelyMergeInBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const AudioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    (typeof AudioContext !== "undefined" ||
      typeof AudioWindow.webkitAudioContext !== "undefined")
  );
}
