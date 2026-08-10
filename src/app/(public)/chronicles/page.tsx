import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import SiteFooter from "@/components/SiteFooter";
import JoinEngineCTA from "@/components/marketing/JoinEngineCTA";
import { getAllBlogPostsAsync } from "@/lib/blog/posts";
import { buildCanonical } from "@/lib/seo/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The Sweatlife Chronicles",
  description:
    "Stories, training notes, and performance nutrition from Hunter Broussard and the Vitality Sweat community.",
  alternates: {
    canonical: buildCanonical("/chronicles"),
  },
  openGraph: {
    title: "The Sweatlife Chronicles",
    description:
      "Training truths, nutrition that travels, and field notes from Hunter's coaching life.",
    url: buildCanonical("/chronicles"),
    images: [
      {
        url: "/images/stock/graphics/blog-workout-plan-energy.png",
        width: 1200,
        height: 630,
        alt: "Sweatlife Chronicles workout energy graphic",
      },
    ],
  },
};

export default async function ChroniclesPage() {
  const posts = await getAllBlogPostsAsync();

  return (
    <>
      <div className="bg-surface">
        <section className="relative isolate min-h-[42vh] overflow-hidden bg-surface-dark text-white">
          <Image
            src="/images/stock/graphics/blog-workout-plan-energy.png"
            alt="Vitality Sweat workout energy graphic"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50"
          />
          <div aria-hidden className="absolute inset-0 bg-brand-ink/70" />
          <div className="site-shell relative flex min-h-[42vh] flex-col justify-end pb-14 pt-24">
            <p className="eyebrow text-brand-orange">Blog</p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.95]">
              The Sweatlife Chronicles
            </h1>
            <p className="mt-4 max-w-xl font-sans text-lg text-white/85">
              Training truths, nutrition that travels, and field notes from
              Hunter&apos;s coaching life.
            </p>
          </div>
        </section>

        <div className="section-y site-shell space-y-10">
          <AdSlot slotId="chronicles-top" size="banner" />
          <JoinEngineCTA location="chronicles_mid" variant="strip" />
          <ul className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden bg-brand-ink/5">
                    <Image
                      src={post.coverImage}
                      alt={post.coverAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <p className="eyebrow text-brand-orange">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(post.datePublished))}
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-brand-ink group-hover:text-brand-orange">
                    {post.title}
                  </h2>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
                    {post.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <JoinEngineCTA location="chronicles_end" variant="end" />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
