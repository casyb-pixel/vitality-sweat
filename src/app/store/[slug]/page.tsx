import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import ProductCard from "@/components/store/ProductCard";
import {
  absoluteUrl,
  buildCanonical,
  SITE_NAME,
} from "@/lib/seo/site";
import { getStorefrontCatalog } from "@/lib/store/catalog";
import { findProductBySlug, productPath, productSlug } from "@/lib/store/product-slug";
import { buildProductJsonLd } from "@/lib/store/products";
import { stripEmDashes } from "@/lib/text/humanize-copy";

export const revalidate = 300;

const RESERVED_STORE_SLUGS = new Set(["cart", "checkout", "order"]);

type StoreProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: StoreProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_STORE_SLUGS.has(slug)) return { title: "Store" };
  const catalog = await getStorefrontCatalog();
  const product = findProductBySlug(catalog.products, slug);
  if (!product) return { title: "Store" };
  const description = stripEmDashes(product.description);
  return {
    title: `${product.name} | Store`,
    description,
    alternates: {
      canonical: buildCanonical(productPath(product)),
    },
    openGraph: {
      type: "website",
      url: buildCanonical(productPath(product)),
      siteName: SITE_NAME,
      title: `${product.name} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: product.image.startsWith("http")
            ? product.image
            : absoluteUrl(product.image),
          width: 1200,
          height: 630,
          alt: product.imageAlt,
        },
      ],
    },
  };
}

export default async function StoreProductPage({
  params,
}: StoreProductPageProps) {
  const { slug } = await params;
  if (RESERVED_STORE_SLUGS.has(slug)) notFound();
  const catalog = await getStorefrontCatalog();
  const product = findProductBySlug(catalog.products, slug);
  if (!product) notFound();

  if (productSlug(product) !== slug) {
    redirect(productPath(product));
  }

  return (
    <>
      <Navbar />
      <JsonLd data={buildProductJsonLd(product)} />
      <div className="bg-surface">
        <section className="site-shell section-y">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
            <Link href="/store" className="hover:text-brand-orange">
              Store
            </Link>
            <span aria-hidden className="px-2">
              /
            </span>
            {product.name}
          </p>
          <div className="mt-8 max-w-xl">
            <ProductCard product={product} />
          </div>
          <p className="mt-8 max-w-xl font-sans text-sm leading-relaxed text-brand-muted">
            Official Vitality Sweat gear for the coaching community. Printful
            fulfillment. See the{" "}
            <Link href="/return-policy" className="font-semibold text-brand-ink hover:text-brand-orange">
              return policy
            </Link>{" "}
            before you order.
          </p>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
