import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import StoreProductGrid from "@/components/store/StoreProductGrid";
import {
  absoluteUrl,
  buildCanonical,
  SITE_NAME,
} from "@/lib/seo/site";
import {
  buildStoreCollectionJsonLd,
} from "@/lib/store/products";
import { getStorefrontCatalog } from "@/lib/store/catalog";

const STORE_DESCRIPTION =
  "Secondary training gear from Vitality Sweat, Hunter Broussard's Southwest Louisiana coaching brand. Official hoodies and variants for the Sweatlife community.";

/** Refresh live Printful merch about every 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Store",
  description: STORE_DESCRIPTION,
  alternates: {
    canonical: buildCanonical("/store"),
  },
  openGraph: {
    type: "website",
    url: buildCanonical("/store"),
    siteName: SITE_NAME,
    title: `Store | ${SITE_NAME}`,
    description: STORE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/images/stock/fitness/gear-wakeup-flatlay.jpg"),
        width: 1200,
        height: 630,
        alt: "Official Vitality Sweat training gear for the coaching community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Store | ${SITE_NAME}`,
    description: STORE_DESCRIPTION,
    images: [absoluteUrl("/images/stock/fitness/gear-wakeup-flatlay.jpg")],
  },
};

export default async function StorePage() {
  const catalog = await getStorefrontCatalog();

  return (
    <>
      <Navbar />
      <JsonLd data={buildStoreCollectionJsonLd(catalog.products)} />
      <div className="bg-surface">
        <section className="relative isolate min-h-[42vh] overflow-hidden bg-surface-dark text-white">
          <Image
            src="/images/stock/fitness/gear-wakeup-flatlay.jpg"
            alt="Vitality Sweat training gear laid out for the day"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50"
          />
          <div aria-hidden className="absolute inset-0 bg-brand-ink/70" />
          <div className="site-shell relative flex min-h-[42vh] flex-col justify-end pb-12 pt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-brand-orange">Coaching community gear</p>
                <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.5rem,6vw,4rem)] leading-[0.95]">
                  Vitality Sweat Store
                </h1>
                <p className="mt-4 max-w-xl font-sans text-lg text-white/85">
                  Secondary merch for the Vitality Sweat coaching community.
                  Training gear sits behind fitness, nutrition, and youth baseball.
                  Live Printful catalog for the Sweatlife.
                </p>
              </div>
              <Link
                href="/store/cart"
                className="inline-flex border border-white/35 bg-white/10 px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm hover:bg-white/20"
              >
                View cart
              </Link>
            </div>
          </div>
        </section>

        <section className="section-y site-shell">
          <StoreProductGrid
            initialProducts={catalog.products}
            initialSource={catalog.source}
            initialNote={catalog.message}
          />
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
