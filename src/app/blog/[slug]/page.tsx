import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import FeaturedGearSlider from "@/components/store/FeaturedGearSlider";
import {
  buildArticleJsonLd,
  getAllBlogPosts,
  getBlogPostBySlug,
  type BlogBlock,
} from "@/lib/blog/posts";
import { absoluteUrl, buildCanonical } from "@/lib/seo/site";
import { getFeaturedGear } from "@/lib/store/products";

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = buildCanonical(`/blog/${post.slug}`);
  const ogImage = absoluteUrl(post.ogImage);

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

function ArticleBlocks({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={key}
                className="pt-4 font-display text-[clamp(1.65rem,3vw,2.15rem)] leading-[1.15] text-brand-ink"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={key}
                className="pt-2 font-display text-xl text-brand-ink sm:text-2xl"
              >
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul
                key={key}
                className="list-disc space-y-2 pl-5 font-sans text-lg leading-relaxed text-brand-muted"
              >
                {block.items.map((item) => (
                  <li key={item.slice(0, 40)}>{item}</li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={key} className="relative my-6 aspect-[16/10] overflow-hidden bg-brand-ink/5">
                <Image
                  src={block.src}
                  alt={block.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-contain bg-surface-elevated"
                />
              </figure>
            );
          default:
            return (
              <p
                key={key}
                className="font-sans text-lg leading-relaxed text-brand-muted"
              >
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}

export default async function BlogArticlePage({ params }: BlogPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) notFound();

  const publishedLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(post.datePublished));

  const featuredGear = getFeaturedGear(4);

  return (
    <>
      <Navbar />
      <JsonLd data={buildArticleJsonLd(post)} />
      <article className="bg-surface">
        <header className="relative isolate min-h-[44vh] overflow-hidden bg-surface-dark text-white">
          <Image
            src={post.coverImage}
            alt={post.coverAlt}
            fill
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
              <Image
                src={post.ogImage}
                alt={post.coverAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {post.keywords.map((keyword) => (
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
    </>
  );
}
