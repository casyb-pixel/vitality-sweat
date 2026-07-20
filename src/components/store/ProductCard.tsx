"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductSize, StoreProduct } from "@/lib/store/products";

type ProductCardProps = {
  product: StoreProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  const [size, setSize] = useState<ProductSize>(product.sizes[0]);
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="flex h-full flex-col border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
      <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-brand-ink/5">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      <p className="eyebrow">{product.category}</p>
      <h2 className="mt-2 font-display text-2xl text-brand-ink">{product.name}</h2>
      <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-brand-muted">
        {product.description}
      </p>

      <p className="mt-4 font-sans text-xl font-semibold tracking-tight text-brand-ink">
        ${product.price}
        <span className="ml-1 text-sm font-medium text-brand-muted">
          {product.currency}
        </span>
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-brand-muted">
          Size
        </legend>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((option) => {
            const selected = option === size;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                aria-pressed={selected}
                className={`min-w-11 border px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide transition-colors ${
                  selected
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-ink/15 bg-surface text-brand-ink hover:border-brand-orange"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex w-full items-center justify-center bg-brand-orange px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
      >
        {added ? `Added · ${size}` : "Add to Cart"}
      </button>
    </article>
  );
}
