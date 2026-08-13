import type { Metadata } from "next";
import Link from "next/link";
import AffiliateDisclosure from "@/components/affiliates/AffiliateDisclosure";
import PublicPage from "@/components/public/PublicPage";
import { GEAR_REVIEWS } from "@/lib/gear/catalog";
import { getHub } from "@/lib/content/hubs";
import { buildCanonical } from "@/lib/seo/site";

const hub = getHub("gear")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: buildCanonical("/gear") },
};

export default function GearHubPage() {
  return (
    <PublicPage eyebrow={hub.eyebrow} title={hub.title} lede={hub.description}>
      <AffiliateDisclosure />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {GEAR_REVIEWS.map((review) => (
          <li key={review.slug}>
            <Link
              href={`/gear/${review.slug}`}
              className="block h-full border border-brand-ink/10 bg-surface-elevated p-5 hover:border-brand-orange"
            >
              <p className="eyebrow text-brand-orange">{review.category}</p>
              <h2 className="mt-2 font-display text-2xl text-brand-ink">
                {review.title}
              </h2>
              <p className="mt-2 font-sans text-sm text-brand-muted">
                {review.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </PublicPage>
  );
}
