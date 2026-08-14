"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { trackGaEvent } from "@/lib/analytics/ga";
import { composeShareCard } from "@/lib/share/compose-card-client";
import type { MilestoneShareCard } from "@/lib/share/milestone-caption";
import {
  dataUrlToFile,
  downloadDataUrl,
  facebookSharerUrl,
  instagramAppUrl,
  openExternal,
  twitterIntentUrl,
} from "@/lib/share/platform-intents";

export type SharePackPayload = {
  caption: string;
  shareUrl: string;
  card: MilestoneShareCard;
  image: string | null;
};

type SharePackSheetProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  hint?: string;
  pack: SharePackPayload | null;
  caption: string;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  filename?: string;
  eventKind?: string;
  extraActions?: ReactNode;
};

const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";
const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-brand-orange-deep disabled:opacity-60";

export default function SharePackSheet({
  open,
  title,
  eyebrow = "Share",
  hint,
  pack,
  caption,
  onCaptionChange,
  onClose,
  filename = "vitality-engine-share.png",
  eventKind = "engine",
  extraActions,
}: SharePackSheetProps) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPhotoDataUrl(null);
      setPreviewUrl(null);
      setStatus(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !pack) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await composeShareCard({
          card: pack.card,
          eyebrow,
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
  }, [open, pack, photoDataUrl, eyebrow]);

  if (!open || !pack) return null;
  const sharePack = pack;

  function track(method: string) {
    trackGaEvent("share_milestone_complete", {
      milestone_type: eventKind,
      share_method: method,
    });
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
    if (!previewUrl) return;
    setBusy(true);
    setError(null);
    try {
      const file = await dataUrlToFile(previewUrl, filename);
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (typeof navigator.share === "function") {
        if (canShareFiles) {
          await navigator.share({
            title,
            text: caption,
            files: [file],
          });
        } else {
          await navigator.share({
            title,
            text: caption,
            url: sharePack.shareUrl,
          });
        }
        track("web_share");
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

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      track("copy_caption");
      setStatus("Caption copied.");
    } catch {
      setError("Could not copy caption.");
    }
  }

  function saveImage() {
    if (!previewUrl) return;
    downloadDataUrl(previewUrl, filename);
    track("download");
    setStatus("Image saved.");
  }

  function shareX() {
    openExternal(twitterIntentUrl(caption, sharePack.shareUrl));
    track("x");
    setStatus("Opened X. Paste the image if you want the graphic on the post.");
  }

  function shareFacebook() {
    openExternal(facebookSharerUrl(sharePack.shareUrl));
    track("facebook");
    setStatus("Opened Facebook. Attach the saved image if the preview is just the link.");
  }

  async function shareInstagram() {
    await copyCaption();
    saveImage();
    try {
      window.location.href = instagramAppUrl();
    } catch {
      // Desktop or blocked deep link.
    }
    track("instagram");
    setStatus(
      "Instagram does not allow apps to post for you. Caption copied and image saved. Open Instagram and paste.",
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-pack-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-brand-ink/10 bg-surface-elevated p-4 shadow-lg sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-brand-orange">{eyebrow}</p>
            <h3
              id="share-pack-title"
              className="font-display text-2xl text-brand-ink"
            >
              {title}
            </h3>
          </div>
          <button type="button" className={secondaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mt-2 font-sans text-xs text-brand-muted">
          {hint ??
            "Nothing posts until you tap a button. Instagram cannot be auto-posted from the web."}
        </p>

        <div className="mt-4 space-y-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Branded share preview"
              className="mx-auto max-h-72 w-auto border border-brand-ink/10"
            />
          ) : (
            <p className="font-sans text-xs text-brand-muted">
              Building share card…
            </p>
          )}

          <div>
            <label
              htmlFor="share-pack-photo"
              className="block font-sans text-sm font-semibold text-brand-ink"
            >
              Optional photo
            </label>
            <input
              ref={fileRef}
              id="share-pack-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1.5 block w-full font-sans text-sm text-brand-ink"
              onChange={(e) => onPhotoPicked(e.target.files?.[0] ?? null)}
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
              htmlFor="share-pack-caption"
              className="block font-sans text-sm font-semibold text-brand-ink"
            >
              Caption
            </label>
            <textarea
              id="share-pack-caption"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
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
            <button type="button" className={secondaryBtn} onClick={shareX}>
              X
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={shareFacebook}
            >
              Facebook
            </button>
            <button
              type="button"
              className={secondaryBtn}
              disabled={!previewUrl}
              onClick={() => void shareInstagram()}
            >
              Instagram
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => void copyCaption()}
            >
              Copy caption
            </button>
            <button
              type="button"
              className={secondaryBtn}
              disabled={!previewUrl}
              onClick={saveImage}
            >
              Save image
            </button>
          </div>

          {extraActions}

          {status ? (
            <p className="font-sans text-xs text-brand-muted">{status}</p>
          ) : null}
          {error ? (
            <p className="font-sans text-xs text-red-700">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
