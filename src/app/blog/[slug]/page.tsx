import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBlocks from "@/components/blog/ArticleBlocks";
import SafeCoverImage from "@/components/blog/SafeCoverImage";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import FeaturedGearSlider from "@/components/store/FeaturedGearSlider";
import {
  buildArticleJsonLd,
  getBlogPostBySlugAsync,
} from "@/lib/blog/posts";
import { absoluteUrl, buildCanonical } from "@/lib/seo/site";
import { getFeaturedGear } from "@/lib/store/products";

/**
 * Always render on request so newly published Creator Studio posts
 * (Supabase + remote cover URLs) never stick on a cached 500 from ISR.
 */
export const dynamic = "force-dynamic";

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlugAsync(slug);

  if (!post) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = buildCanonical(`/blog/${post.slug}`);
  const ogImage = absoluteUrl(post.ogImage || post.coverImage || "/images/hero-strength-stamina-collage.png");

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description: post.description,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [post.author],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.coverAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

export default async function BlogArticlePage({ params }: BlogPageProps) {
  const { slug } = await params;
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

  const featuredGear = getFeaturedGear(4);
  const coverSrc =
    post.coverImage?.trim() || "/images/hero-strength-stamina-collage.png";
  const ogSrc = post.ogImage?.trim() || coverSrc;

  return (
    <>
      <Navbar />
      <JsonLd data={buildArticleJsonLd(post)} />
      <article className="bg-surface">
        <header className="relative isolate min-h-[44vh] overflow-hidden bg-surface-dark text-white">
          <SafeCoverImage
            src={coverSrc}
            alt={post.coverAlt}
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />
          <div aria-hidden className="absolute inset-0 bg-brand-ink/65" />
          <div className="site-shell relative flex min-h-[44vh] flex-col justify-end pb-12 pt-24">
            <p className="eyebrow text-brand-orange">Sweatlife Chronicles</p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] text-balance">
              {post.title}
            </h1>
            {post.subtitle ? (
              <p className="mt-3 max-w-2xl font-display text-xl text-brand-orange sm:text-2xl">
                {post.subtitle}
              </p>
            ) : null}
            <p className="mt-4 max-w-2xl font-sans text-base text-white/85 sm:text-lg">
              {post.excerpt}
            </p>
            <p className="mt-5 font-sans text-sm text-white/70">
              By {post.author} · {publishedLabel}
            </p>
          </div>
        </header>

        <div className="section-y site-shell grid gap-10 lg:grid-cols-12">
          <div className="max-w-2xl lg:col-span-8">
            <ArticleBlocks blocks={post.body} />
            <Link
              href="/chronicles"
              className="mt-10 inline-flex font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange hover:text-brand-orange-deep"
            >
              ← Back to Chronicles
            </Link>
          </div>

          <aside className="lg:col-span-4">
            <div className="relative aspect-[4/3] overflow-hidden bg-brand-ink/5">
              <SafeCoverImage
                src={ogSrc}
                alt={post.coverAlt}
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {(post.keywords ?? []).map((keyword) => (
                <li
                  key={keyword}
                  className="border border-brand-ink/10 bg-surface-elevated px-2.5 py-1 font-sans text-xs text-brand-muted"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </article>

      <FeaturedGearSlider products={featuredGear} />
      <SiteFooter />
    </>
  );
}
