import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import ProductCard from "@/components/store/ProductCard";
import {
  absoluteUrl,
  buildCanonical,
  SITE_NAME,
} from "@/lib/seo/site";
import {
  buildStoreCollectionJsonLd,
  STORE_PRODUCTS,
} from "@/lib/store/products";

const STORE_DESCRIPTION =
  "Shop Vitality Sweat branded merchandise — performance hoodies, everyday gym tees, insulated bottles, and training packs.";

export const metadata: Metadata = {
  title: "Store",
  description: STORE_DESCRIPTION,
  alternates: {
    canonical: buildCanonical("/store"),
  },
  openGraph: {
    type: "website",
    url: buildCanonical("/store"),
    title: `Store | ${SITE_NAME}`,
    description: STORE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/images/stock/fitness/gear-wakeup-flatlay.jpg"),
        width: 1200,
        height: 630,
        alt: "Vitality Sweat training gear",
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

export default function StorePage() {
  return (
    <>
      <Navbar />
      <JsonLd data={buildStoreCollectionJsonLd(STORE_PRODUCTS)} />
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
            <p className="eyebrow text-brand-orange">Branded merchandise</p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.5rem,6vw,4rem)] leading-[0.95]">
              Vitality Sweat Store
            </h1>
            <p className="mt-4 max-w-xl font-sans text-lg text-white/85">
              Performance hoodies, everyday gym tees, and hydration that keeps
              up — merch built for the Sweatlife.
            </p>
          </div>
        </section>

        <section className="section-y site-shell">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {STORE_PRODUCTS.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
