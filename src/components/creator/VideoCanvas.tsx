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

type VideoCanvasProps = {
  caption: string;
  onCaptionChange: (value: string) => void;
  recommendationLabel?: string | null;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCanvas({
  caption,
  onCaptionChange,
  recommendationLabel,
}: VideoCanvasProps) {
  const inputId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeNote, setAnalyzeNote] = useState<string | null>(null);

  const trimLabel = useMemo(() => {
    if (duration <= 0) return "Load a clip to enable trim placeholders";
    return `${formatTime(trimStart)} → ${formatTime(trimEnd)} · ${formatTime(
      Math.max(trimEnd - trimStart, 0),
    )} keep`;
  }, [duration, trimEnd, trimStart]);

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeUrl(), [revokeUrl]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    revokeUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setFileName(file.name);
    setAnalyzeNote(null);

    const video = videoRef.current;
    if (video) {
      video.src = url;
      video.load();
    }
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const d = video.duration || 0;
    setDuration(d);
    setTrimStart(0);
    setTrimEnd(d);
  };

  const clampTrim = (start: number, end: number) => {
    const s = Math.min(Math.max(0, start), Math.max(duration - 0.1, 0));
    const e = Math.min(Math.max(s + 0.1, end), duration || s + 0.1);
    setTrimStart(s);
    setTrimEnd(e);
  };

  const runAnalyzeStub = async () => {
    setAnalyzing(true);
    setAnalyzeNote(null);
    try {
      const res = await fetch("/api/creator/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "script",
          captionDraft: caption,
          clipMeta: {
            fileName,
            trimStart,
            trimEnd,
            duration,
            recommendationLabel: recommendationLabel ?? null,
          },
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        text?: string;
        model?: string;
        message?: string;
        suggestion?: { caption?: string };
        error?: string;
      };

      if (!res.ok) {
        setAnalyzeNote(data.error ?? "Analyze request failed.");
        return;
      }

      const generated = data.text ?? data.suggestion?.caption;
      if (generated) {
        onCaptionChange(generated);
      }
      setAnalyzeNote(
        data.message ??
          (data.model
            ? `Gemini (${data.model}) returned a caption draft.`
            : "Gemini responded."),
      );
    } catch {
      setAnalyzeNote("Could not reach analyze API.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section className="border border-brand-ink/10 bg-surface-elevated">
      <header className="border-b border-brand-ink/10 px-4 py-4 sm:px-5">
        <p className="eyebrow text-brand-orange">Video canvas</p>
        <h2 className="mt-1 font-display text-2xl text-brand-ink sm:text-[1.75rem]">
          Clip + caption
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
          Mobile-first upload, social caption fields, and trim placeholders for
          on-the-go editing.
        </p>
      </header>

      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="relative aspect-[9/16] max-h-[70vh] w-full overflow-hidden bg-surface-dark sm:mx-auto sm:max-w-sm">
          <video
            ref={videoRef}
            controls
            playsInline
            onLoadedMetadata={onLoadedMetadata}
            className="h-full w-full object-contain"
          />
          {!fileName ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="font-display text-xl text-white">Drop a raw clip</p>
              <p className="font-sans text-xs text-white/70">
                Vertical 9:16 preview · phone-first framing
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={inputId}
            className="inline-flex w-full cursor-pointer items-center justify-center bg-brand-ink px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-muted"
          >
            {fileName ? "Replace clip" : "Choose video file"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="video/*,.mov,.mp4,.m4v"
            className="sr-only"
            onChange={onFileChange}
          />
          {fileName ? (
            <p className="mt-2 truncate font-sans text-xs text-brand-muted">
              Loaded · {fileName}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 border border-brand-ink/10 bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-sm font-semibold text-brand-ink">
              Trim placeholders
            </p>
            <p className="font-sans text-[0.7rem] text-brand-muted">
              {trimLabel}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-brand-muted">
              In point
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={trimStart}
              disabled={duration <= 0}
              onChange={(e) =>
                clampTrim(Number(e.target.value), trimEnd)
              }
              className="w-full accent-brand-orange disabled:opacity-40"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Out point
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={trimEnd}
              disabled={duration <= 0}
              onChange={(e) =>
                clampTrim(trimStart, Number(e.target.value))
              }
              className="w-full accent-brand-orange disabled:opacity-40"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-brand-muted">
            AI / social caption
          </span>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={6}
            placeholder="Paste or generate a caption for Reels, Shorts, or Stories…"
            className="w-full resize-y border border-brand-ink/15 bg-surface-elevated px-3 py-3 font-sans text-sm leading-relaxed text-brand-ink outline-none transition-colors placeholder:text-brand-muted/60 focus:border-brand-orange"
          />
        </label>

        {recommendationLabel ? (
          <p className="font-sans text-xs text-brand-muted">
            Linked recommendation ·{" "}
            <span className="font-semibold text-brand-ink">
              {recommendationLabel}
            </span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={runAnalyzeStub}
          disabled={analyzing}
          className="inline-flex w-full items-center justify-center bg-brand-orange px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep disabled:opacity-60"
        >
          {analyzing ? "Analyzing…" : "Run Gemini analyze (scaffold)"}
        </button>

        {analyzeNote ? (
          <p className="font-sans text-xs leading-relaxed text-brand-muted">
            {analyzeNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
