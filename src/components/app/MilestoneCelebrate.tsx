"use client";

import { useEffect, useRef, useState } from "react";
import {
  trackShareMilestoneComplete,
  trackShareMilestoneIntent,
} from "@/lib/analytics/ga";
import {
  milestoneChipPrompt,
  type WorkoutMilestone,
} from "@/lib/fitness/milestones";
import type { MilestoneShareCard } from "@/lib/share/milestone-caption";
import { MILESTONE_LOGO_PATH } from "@/lib/share/milestone-caption";

type SharePackage = {
  caption: string;
  shareUrl: string;
  card: MilestoneShareCard;
  image: string | null;
};

type MilestoneCelebrateProps = {
  milestone: WorkoutMilestone | null;
  onDismiss: () => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

/**
 * Compose a branded share card. Uses optional member photo; always includes logo.
 * Client-side so we never upload/store the photo.
 */
async function composeShareCard(input: {
  card: MilestoneShareCard;
  photoDataUrl?: string | null;
  serverImage?: string | null;
}): Promise<string> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");

  if (input.photoDataUrl) {
    const photo = await loadImage(input.photoDataUrl);
    // Cover-fit photo
    const scale = Math.max(width / photo.width, height / photo.height);
    const tw = photo.width * scale;
    const th = photo.height * scale;
    ctx.drawImage(photo, (width - tw) / 2, (height - th) / 2, tw, th);
    ctx.fillStyle = "rgba(20, 12, 8, 0.55)";
    ctx.fillRect(0, 0, width, height);
  } else if (input.serverImage) {
    const base = await loadImage(input.serverImage);
    ctx.drawImage(base, 0, 0, width, height);
    // Still stamp logo again for photo-less path when redrawing caption? Server already has it.
    return canvas.toDataURL("image/png");
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#1a1410");
    grad.addColorStop(0.45, "#3d2a1f");
    grad.addColorStop(1, "#e85d04");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  try {
    const logo = await loadImage(input.card.logoPath || MILESTONE_LOGO_PATH);
    const logoW = 220;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, 72, 64, logoW, logoH);
  } catch {
    // Logo load failed; continue with text branding.
  }

  ctx.fillStyle = "#fff8f0";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText("MILESTONE", 72, 220);

  ctx.font = "800 64px system-ui, sans-serif";
  wrapText(ctx, input.card.headline, 72, 320, width - 144, 72);

  ctx.font = "400 34px system-ui, sans-serif";
  wrapText(ctx, input.card.detail, 72, 520, width - 144, 44);

  ctx.fillStyle = "rgba(255,248,240,0.35)";
  ctx.fillRect(72, height - 220, width - 144, 2);
  ctx.fillStyle = "#fff8f0";
  ctx.font = "800 40px system-ui, sans-serif";
  ctx.fillText(input.card.brand || "Vitality Engine", 72, height - 150);
  ctx.font = "400 26px system-ui, sans-serif";
  ctx.fillText("Train free. Share the work.", 72, height - 100);

  return canvas.toDataURL("image/png");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

/**
 * Soft milestone chip + confirm Celebrate sheet. Never auto-shares.
 */
export default function MilestoneCelebrate({
  milestone,
  onDismiss,
}: MilestoneCelebrateProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pack, setPack] = useState<SharePackage | null>(null);
  const [caption, setCaption] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSheetOpen(false);
    setPack(null);
    setCaption("");
    setPhotoDataUrl(null);
    setPreviewUrl(null);
    setStatus(null);
    setError(null);
  }, [milestone?.title, milestone?.type, milestone?.detail]);

  useEffect(() => {
    if (!sheetOpen || !pack) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await composeShareCard({
          card: pack.card,
          photoDataUrl,
          serverImage: photoDataUrl ? null : pack.image,
        });
        if (!cancelled) setPreviewUrl(url);
      } catch {
        if (!cancelled) setPreviewUrl(pack.image);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, pack, photoDataUrl]);

  if (!milestone) return null;

  const secondaryBtn =
    "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";
  const primaryBtn =
    "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-brand-orange-deep disabled:opacity-60";

  async function openSheet() {
    setError(null);
    setStatus(null);
    setBusy(true);
    trackShareMilestoneIntent(milestone!.type);
    try {
      const res = await fetch("/api/app/share/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: milestone!.type,
          title: milestone!.title,
          detail: milestone!.detail,
          exercise_id: milestone!.exercise_id,
          stats: milestone!.stats,
        }),
      });
      const json = (await res.json()) as SharePackage & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not prepare share card.");
        return;
      }
      setPack({
        caption: json.caption,
        shareUrl: json.shareUrl,
        card: json.card,
        image: json.image,
      });
      setCaption(json.caption);
      setSheetOpen(true);
    } catch {
      setError("Could not prepare share card.");
    } finally {
      setBusy(false);
    }
  }

  function onPhotoPicked(file: File | null) {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Pick a photo image.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Photo is too large (max about 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  async function shareNative() {
    if (!pack || !previewUrl) return;
    setBusy(true);
    setError(null);
    try {
      const file = await dataUrlToFile(
        previewUrl,
        `vitality-milestone-${milestone!.type}.png`,
      );
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (typeof navigator.share === "function") {
        if (canShareFiles) {
          await navigator.share({
            title: milestone!.title,
            text: caption,
            files: [file],
          });
        } else {
          await navigator.share({
            title: milestone!.title,
            text: caption,
            url: pack.shareUrl,
          });
        }
        trackShareMilestoneComplete(milestone!.type, "web_share");
        setStatus("Shared. Nice work.");
        return;
      }

      setError("Sharing is not available here. Download the image or copy the caption.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("Share cancelled.");
      } else {
        setError("Share did not complete. Try download or copy.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function downloadImage() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `vitality-milestone-${milestone!.type}.png`;
    a.click();
    trackShareMilestoneComplete(milestone!.type, "download");
    setStatus("Image downloaded.");
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      trackShareMilestoneComplete(milestone!.type, "copy_caption");
      setStatus("Caption copied.");
    } catch {
      setError("Could not copy caption.");
    }
  }

  return (
    <div className="space-y-2" aria-live="polite">
      {!sheetOpen ? (
        <div className="relative border border-brand-orange/25 bg-brand-orange/5 px-3 py-2.5 pr-9">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
            Milestone
          </p>
          <p className="mt-0.5 font-sans text-sm font-semibold text-brand-ink">
            {milestoneChipPrompt(milestone)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void openSheet()}
              disabled={busy}
            >
              {busy ? "Preparing…" : "Celebrate"}
            </button>
            <button type="button" className={secondaryBtn} onClick={onDismiss}>
              Not now
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-2 top-2 font-sans text-xs font-semibold text-brand-muted hover:text-brand-ink"
            aria-label="Dismiss milestone"
          >
            Close
          </button>
          {error ? (
            <p className="mt-2 font-sans text-xs text-red-700">{error}</p>
          ) : null}
        </div>
      ) : (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebrate-title"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-brand-ink/10 bg-surface-elevated p-4 shadow-lg sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-brand-orange">Celebrate</p>
                <h3
                  id="celebrate-title"
                  className="font-display text-2xl text-brand-ink"
                >
                  {milestone.title}
                </h3>
              </div>
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => {
                  setSheetOpen(false);
                  onDismiss();
                }}
              >
                Close
              </button>
            </div>
            <p className="mt-2 font-sans text-sm text-brand-muted">
              {milestone.detail}
            </p>
            <p className="mt-2 font-sans text-xs text-brand-muted">
              Nothing posts until you tap Share. Instagram and TikTok are not
              auto-posted from the web.
            </p>

            <div className="mt-4 space-y-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Branded milestone share preview"
                  className="mx-auto max-h-72 w-auto border border-brand-ink/10"
                />
              ) : (
                <p className="font-sans text-xs text-brand-muted">
                  Building share card…
                </p>
              )}

              <div>
                <label
                  htmlFor="milestone-photo"
                  className="block font-sans text-sm font-semibold text-brand-ink"
                >
                  Optional photo
                </label>
                <input
                  ref={fileRef}
                  id="milestone-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="mt-1.5 block w-full font-sans text-sm text-brand-ink"
                  onChange={(e) =>
                    onPhotoPicked(e.target.files?.[0] ?? null)
                  }
                />
                {photoDataUrl ? (
                  <button
                    type="button"
                    className={`${secondaryBtn} mt-2`}
                    onClick={() => {
                      setPhotoDataUrl(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="milestone-caption"
                  className="block font-sans text-sm font-semibold text-brand-ink"
                >
                  Caption
                </label>
                <textarea
                  id="milestone-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className="mt-1.5 w-full border border-brand-ink/15 bg-white px-3 py-2 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={busy || !previewUrl}
                  onClick={() => void shareNative()}
                >
                  Share
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  disabled={!previewUrl}
                  onClick={() => void downloadImage()}
                >
                  Download image
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => void copyCaption()}
                >
                  Copy caption
                </button>
              </div>

              {status ? (
                <p className="font-sans text-xs text-brand-muted">{status}</p>
              ) : null}
              {error ? (
                <p className="font-sans text-xs text-red-700">{error}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
