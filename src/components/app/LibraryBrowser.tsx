"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import SafeCoverImage from "@/components/blog/SafeCoverImage";
import { toYouTubeEmbedSrc } from "@/lib/blog/video-embeds";
import { formatSecondsToClock } from "@/lib/video/youtube-clips";
import type { Video } from "@/lib/fitness/types";
import {
  filterLibraryPosts,
  type LibraryPostSummary,
} from "@/lib/library/search";
import { SOCIAL_LINKS } from "@/lib/seo/site";

type LibraryBrowserProps = {
  posts: LibraryPostSummary[];
  videos: Video[];
};

const YOUTUBE_HREF =
  SOCIAL_LINKS.find((l) => l.id === "youtube")?.href ??
  "https://www.youtube.com/@vitalitysweat";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function LibraryBrowser({ posts, videos }: LibraryBrowserProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const lastLogged = useRef("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 450);
    return () => window.clearTimeout(t);
  }, [query]);

  const filteredPosts = filterLibraryPosts(posts, debounced);
  const qLower = debounced.toLowerCase();
  const filteredVideos = qLower
    ? videos.filter((v) => {
        const hay =
          `${v.title} ${v.description} ${v.category} ${v.gym_name ?? ""}`.toLowerCase();
        return qLower
          .split(/\s+/)
          .filter(Boolean)
          .every((token) => hay.includes(token));
      })
    : videos;

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) return;
    const key = q.toLowerCase();
    if (lastLogged.current === key) return;
    lastLogged.current = key;

    const matched = filterLibraryPosts(posts, q);
    const videoHits = videos.filter((v) => {
      const hay =
        `${v.title} ${v.description} ${v.category} ${v.gym_name ?? ""}`.toLowerCase();
      return key
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => hay.includes(token));
    });

    void fetch("/api/app/library/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        resultCount: matched.length + videoHits.length,
        matchedSlugs: matched.map((p) => p.slug),
      }),
    }).catch(() => {
      /* non-blocking analytics */
    });
  }, [debounced, posts, videos]);

  const searching = debounced.length > 0;
  const empty =
    searching && filteredPosts.length === 0 && filteredVideos.length === 0;

  return (
    <div className="space-y-8">
      <div className="sticky top-[3.5rem] z-30 -mx-4 border-b border-brand-ink/10 bg-surface/95 px-4 py-3 backdrop-blur-md sm:top-16 sm:-mx-0 sm:border sm:border-brand-ink/10 sm:bg-surface-elevated sm:px-4 sm:py-4">
        <label
          htmlFor={searchId}
          className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
        >
          Search topics
        </label>
        <input
          id={searchId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Try glutes, protein, recovery…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2 min-h-14 w-full border-2 border-brand-ink/15 bg-surface px-4 py-3 font-sans text-lg text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-orange focus:outline-none"
        />
        <p className="mt-2 font-sans text-sm text-brand-muted">
          {searching
            ? `${filteredPosts.length} post${filteredPosts.length === 1 ? "" : "s"} · ${filteredVideos.length} video${filteredVideos.length === 1 ? "" : "s"}`
            : "Built for phone browsing mid-walk: big taps, short scrolls."}
        </p>
      </div>

      <a
        href={YOUTUBE_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-14 items-center justify-between gap-3 border border-brand-orange/35 bg-brand-orange/5 px-4 py-3 transition-colors hover:border-brand-orange hover:bg-brand-orange/10"
      >
        <span>
          <span className="block font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-orange">
            YouTube
          </span>
          <span className="mt-0.5 block font-display text-xl text-brand-ink sm:text-2xl">
            Watch Vitality Sweat on YouTube
          </span>
        </span>
        <span className="shrink-0 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
          Open →
        </span>
      </a>

      {empty ? (
        <p className="border border-brand-ink/10 bg-surface-elevated px-4 py-6 font-sans text-base leading-relaxed text-brand-muted">
          No matches for “{debounced}”. We logged the search. Hunter may cover
          this next. Browse everything below or try another topic.
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-brand-ink sm:text-3xl">
            Chronicles
          </h2>
          {!searching ? (
            <span className="font-sans text-sm text-brand-muted">
              {posts.length} posts
            </span>
          ) : null}
        </div>

        {filteredPosts.length === 0 && !empty ? (
          <p className="font-sans text-sm text-brand-muted">
            No Chronicle matches for this search.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {filteredPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/app/library/${post.slug}`}
                  className="group flex min-h-[7.5rem] gap-3 border border-brand-ink/10 bg-surface-elevated p-3 transition-colors hover:border-brand-orange active:bg-brand-orange/5 sm:p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-brand-ink/5 sm:h-28 sm:w-28">
                    <SafeCoverImage
                      src={post.coverImage}
                      alt={post.coverAlt}
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-orange">
                      {formatDate(post.datePublished) || "Chronicle"}
                    </p>
                    <h3 className="mt-1 font-display text-lg leading-snug text-brand-ink group-hover:text-brand-orange sm:text-xl">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 font-sans text-sm leading-relaxed text-brand-muted">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-brand-ink sm:text-3xl">
            Videos
          </h2>
          {!searching ? (
            <span className="font-sans text-sm text-brand-muted">
              {videos.length} clips
            </span>
          ) : null}
        </div>

        {filteredVideos.length === 0 ? (
          <p className="font-sans text-sm text-brand-muted">
            {searching
              ? "No video matches for this search."
              : "No curated videos yet. The YouTube channel above is the live feed."}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredVideos.map((video) => (
              <LibraryVideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LibraryVideoCard({ video }: { video: Video }) {
  const embedSrc =
    video.provider === "youtube"
      ? toYouTubeEmbedSrc(video.video_url, {
          autoplay: false,
          startSec: video.start_sec,
          endSec: video.end_sec,
        })
      : null;
  const clipRange =
    video.start_sec != null || video.end_sec != null
      ? `${formatSecondsToClock(video.start_sec ?? 0)}${
          video.end_sec != null ? ` to ${formatSecondsToClock(video.end_sec)}` : " to end"
        }`
      : null;

  return (
    <article className="flex flex-col border border-brand-ink/10 bg-surface-elevated">
      <div className="relative aspect-video bg-brand-ink/5">
        {embedSrc ? (
          <iframe
            title={video.title}
            src={embedSrc}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
            {video.provider}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-orange">
          {video.category}
        </p>
        <h3 className="mt-1 font-display text-xl text-brand-ink">
          {video.title}
        </h3>
        {video.gym_name ? (
          <p className="mt-1 font-sans text-sm text-brand-muted">
            From {video.gym_name}
            {clipRange ? ` · ${clipRange}` : ""}
          </p>
        ) : clipRange ? (
          <p className="mt-1 font-sans text-sm text-brand-muted">{clipRange}</p>
        ) : null}
        {video.description ? (
          <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-brand-muted">
            {video.description}
          </p>
        ) : null}
        {!embedSrc ? (
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-12 items-center justify-center border border-brand-ink/15 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
          >
            Watch on {video.provider === "youtube" ? "YouTube" : "Vimeo"}
          </a>
        ) : null}
      </div>
    </article>
  );
}
