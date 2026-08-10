import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DynamicVideoEmbedder from "@/components/blog/DynamicVideoEmbedder";
import SafeCoverImage from "@/components/blog/SafeCoverImage";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { getBlogPostBySlugAsync } from "@/lib/blog/posts";
import { fetchPublishedVideoEmbedsForPost } from "@/lib/blog/video-embeds";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import { SOCIAL_LINKS } from "@/lib/seo/site";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Chronicle",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type MemberArticleProps = {
  params: Promise<{ slug: string }>;
};

const YOUTUBE_HREF =
  SOCIAL_LINKS.find((l) => l.id === "youtube")?.href ??
  "https://www.youtube.com/@vitalitysweat";

export default async function MemberLibraryArticlePage({
  params,
}: MemberArticleProps) {
  const { slug } = await params;
  const { user } = await requireMemberAccess(`/app/library/${slug}`);
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) {
    redirect(completion);
  }

  const post = await getBlogPostBySlugAsync(slug);
  if (!post) notFound();

  const publishedDate = new Date(post.datePublished);
  const publishedLabel = Number.isNaN(publishedDate.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(publishedDate);

  const coverSrc =
    post.coverImage?.trim() ||
    "/images/stock/graphics/blog-workout-plan-energy.png";
  const videoEmbeds = await fetchPublishedVideoEmbedsForPost({
    slug: post.slug,
  });

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/library"
          className="inline-flex min-h-11 items-center font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-orange hover:text-brand-orange-deep"
        >
          ← Library
        </Link>
        <a
          href={YOUTUBE_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-sans text-sm font-semibold text-brand-muted hover:text-brand-orange"
        >
          YouTube channel →
        </a>
      </div>

      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Sweatlife Chronicles</p>
        <h1 className="font-display text-[clamp(1.85rem,5.5vw,2.85rem)] leading-[1.08] text-brand-ink text-balance">
          {post.title}
        </h1>
        {post.subtitle ? (
          <p className="font-display text-xl text-brand-orange sm:text-2xl">
            {post.subtitle}
          </p>
        ) : null}
        <p className="max-w-2xl font-sans text-base leading-relaxed text-brand-muted sm:text-lg">
          {post.excerpt}
        </p>
        <p className="font-sans text-sm text-brand-muted">
          By {post.author} · {publishedLabel}
        </p>
      </header>

      <div className="relative aspect-[16/10] overflow-hidden bg-brand-ink/5 sm:aspect-[21/9]">
        <SafeCoverImage
          src={coverSrc}
          alt={post.coverAlt}
          priority
          sizes="(max-width: 960px) 100vw, 960px"
          className="object-cover"
        />
      </div>

      <div className="max-w-2xl space-y-2 [&_.font-sans]:text-[1.125rem] [&_.font-sans]:leading-[1.75] sm:[&_.font-sans]:text-[1.2rem]">
        <DynamicVideoEmbedder
          blocks={post.body}
          embeds={videoEmbeds}
          fallbackThumbnail={coverSrc}
        />
      </div>

      {(post.keywords ?? []).length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {post.keywords.map((keyword) => (
            <li
              key={keyword}
              className="border border-brand-ink/10 bg-surface-elevated px-3 py-1.5 font-sans text-sm text-brand-muted"
            >
              {keyword}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-brand-ink/10 pt-6 sm:flex-row">
        <Link
          href="/app/library"
          className="inline-flex min-h-12 flex-1 items-center justify-center border border-brand-ink/15 px-4 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
        >
          More Chronicles
        </Link>
        <a
          href={YOUTUBE_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 flex-1 items-center justify-center bg-brand-orange px-4 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
        >
          Watch on YouTube
        </a>
      </div>
    </article>
  );
}
