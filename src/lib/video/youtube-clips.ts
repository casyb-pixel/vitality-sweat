export function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (!host.endsWith("youtube.com") && host !== "youtube-nocookie.com") {
      return null;
    }
    if (u.pathname.startsWith("/watch")) {
      return u.searchParams.get("v");
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if (
      parts[0] === "shorts" ||
      parts[0] === "live" ||
      parts[0] === "embed" ||
      parts[0] === "v"
    ) {
      return parts[1] || null;
    }
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

/** Parse 83, 1:23, or 1:02:03 into seconds. */
export function parseClockToSeconds(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  }
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) {
    const [m, s] = parts;
    if (s >= 60) return null;
    return Math.floor(m * 60 + s);
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (m >= 60 || s >= 60) return null;
    return Math.floor(h * 3600 + m * 60 + s);
  }
  return null;
}

export function formatSecondsToClock(total: number): string {
  const sec = Math.max(0, Math.floor(total));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${mm}:${ss}`;
}

export function youtubeWatchUrl(videoId: string, startSec?: number | null): string {
  const base = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  if (startSec != null && startSec > 0) {
    return `${base}&t=${Math.floor(startSec)}s`;
  }
  return base;
}

export function youtubeEmbedSrc(input: {
  videoId: string;
  startSec?: number | null;
  endSec?: number | null;
  autoplay?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set("rel", "0");
  if (input.autoplay) params.set("autoplay", "1");
  if (input.startSec != null && input.startSec > 0) {
    params.set("start", String(Math.floor(input.startSec)));
  }
  if (input.endSec != null && input.endSec > 0) {
    params.set("end", String(Math.floor(input.endSec)));
  }
  return `https://www.youtube.com/embed/${input.videoId}?${params.toString()}`;
}
