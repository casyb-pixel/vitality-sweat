"use client";

import Image from "next/image";
import Link from "next/link";
import type { StoreProduct } from "@/lib/store/products";
import { productPath } from "@/lib/store/product-slug";

type FeaturedGearSliderProps = {
  products: StoreProduct[];
};

export default function FeaturedGearSlider({ products }: FeaturedGearSliderProps) {
  return (
    <section className="border-t border-brand-ink/10 bg-surface-elevated py-[var(--section-y)]">
      <div className="site-shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-brand-orange">Featured gear</p>
            <h2 className="mt-2 font-display text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.05] text-brand-ink">
              Wear the work.
            </h2>
            <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
              Finish the article. Gear up for the next session. Vitality Sweat
              merch built for training days.
            </p>
          </div>
          <Link
            href="/store"
            className="inline-flex shrink-0 items-center font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange hover:text-brand-orange-deep"
          >
            Shop store →
          </Link>
        </div>

        <div className="-mx-4 mt-8 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:px-0">
          {products.map((product) => (
            <Link
              key={product.id}
              href={productPath(product)}
              className="w-[78%] max-w-xs shrink-0 snap-start border border-brand-ink/10 bg-surface p-3 transition-colors hover:border-brand-orange sm:w-72"
            >
              <div className="relative mb-3 aspect-[4/3] overflow-hidden bg-brand-ink/5">
                <Image
                  src={product.image}
                  alt={product.imageAlt}
                  fill
                  sizes="288px"
                  className="object-cover"
                  unoptimized={product.image.startsWith("http")}
                />
              </div>
              <p className="font-display text-lg text-brand-ink">{product.name}</p>
              <p className="mt-1 font-sans text-sm font-semibold text-brand-muted">
                ${product.price}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
