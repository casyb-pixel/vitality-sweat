"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import {
  toVimeoEmbedSrc,
  toYouTubeEmbedSrc,
  type BlogVideoEmbed,
} from "@/lib/blog/video-embeds";

type SectionVideoPlayerProps = {
  embed: BlogVideoEmbed;
  /** Fallback poster when the project has no custom thumbnail. */
  fallbackThumbnail?: string | null;
};

/**
 * High-performance in-article video preview: custom thumbnail + centered
 * brand Play control. Click opens a lightbox so reading flow stays intact.
 */
export default function SectionVideoPlayer({
  embed,
  fallbackThumbnail = null,
}: SectionVideoPlayerProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const poster =
    embed.thumbnailUrl?.trim() ||
    fallbackThumbnail?.trim() ||
    null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <figure className="my-6 overflow-hidden border border-brand-ink/10 bg-surface-dark">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative block aspect-[16/9] w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          aria-label={`Play video: ${embed.title}`}
        >
          {poster ? (
            /^https?:\/\//i.test(poster) ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote Supabase / CDN posters
              <img
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <Image
                src={poster}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-brand-ink via-brand-ink/90 to-brand-orange/40"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-brand-ink/35 transition-colors group-hover:bg-brand-ink/25"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-orange text-white shadow-lg transition-transform duration-300 group-hover:scale-105 sm:size-[4.5rem]">
              <PlayIcon className="ml-1 size-7 sm:size-8" />
            </span>
          </span>
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/80 to-transparent px-4 pb-3 pt-10">
            <span className="font-sans text-sm font-semibold text-white sm:text-base">
              {embed.title}
            </span>
          </figcaption>
        </button>
      </figure>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-ink/80 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[100dvh] w-full max-w-3xl flex-col bg-surface-dark sm:max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <p
                id={titleId}
                className="min-w-0 truncate font-sans text-sm font-semibold text-white"
              >
                {embed.title}
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center bg-brand-orange px-4 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
              >
                Close
              </button>
            </div>
            <div className="relative aspect-[16/9] w-full bg-black">
              <LightboxMedia embed={embed} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LightboxMedia({ embed }: { embed: BlogVideoEmbed }) {
  if (embed.provider === "youtube" && embed.externalUrl) {
    const src = toYouTubeEmbedSrc(embed.externalUrl);
    if (src) {
      return (
        <iframe
          title={embed.title}
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  if (embed.provider === "vimeo" && embed.externalUrl) {
    const src = toVimeoEmbedSrc(embed.externalUrl);
    if (src) {
      return (
        <iframe
          title={embed.title}
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  if (embed.playbackUrl) {
    return (
      <video
        src={embed.playbackUrl}
        controls
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-contain"
      />
    );
  }

  return (
    <p className="absolute inset-0 flex items-center justify-center px-6 text-center font-sans text-sm text-white/80">
      Video is not available yet. Check back after Hunter uploads the clip.
    </p>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M8.25 5.75v12.5L19 12 8.25 5.75z" />
    </svg>
  );
}
