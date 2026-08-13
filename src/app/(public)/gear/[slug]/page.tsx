import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AffiliateDisclosure from "@/components/affiliates/AffiliateDisclosure";
import PublicPage from "@/components/public/PublicPage";
import { AFFILIATE_PICKS } from "@/lib/affiliates/catalog";
import { GEAR_REVIEWS, getGearReview } from "@/lib/gear/catalog";
import { buildCanonical } from "@/lib/seo/site";

export function generateStaticParams() {
  return GEAR_REVIEWS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const review = getGearReview(slug);
  if (!review) return { title: "Gear" };
  return {
    title: review.title,
    description: review.excerpt,
    alternates: { canonical: buildCanonical(`/gear/${review.slug}`) },
  };
}

export default async function GearReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const review = getGearReview(slug);
  if (!review) notFound();
  const pick = review.affiliateSlug
    ? AFFILIATE_PICKS.find((p) => p.slug === review.affiliateSlug)
    : undefined;
  return (
    <PublicPage eyebrow={review.category} title={review.title} lede={review.excerpt}>
      <p className="font-sans text-sm leading-relaxed text-brand-ink">
        {review.body}
      </p>
      {pick ? (
        <p className="mt-4">
          <a
            href={pick.destinationUrl}
            rel="sponsored nofollow"
            className="font-sans text-sm font-semibold text-brand-orange"
          >
            {pick.label}
          </a>
        </p>
      ) : null}
      <div className="mt-6">
        <AffiliateDisclosure extra={pick?.disclosure} />
      </div>
    </PublicPage>
  );
}
