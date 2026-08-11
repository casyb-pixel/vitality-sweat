"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import type { StoreProduct } from "@/lib/store/products";

type FeedResponse = {
  ok: boolean;
  source: "printful" | "fallback";
  products: StoreProduct[];
  message?: string;
  error?: string;
};

type StoreProductGridProps = {
  initialProducts: StoreProduct[];
};

export default function StoreProductGrid({
  initialProducts,
}: StoreProductGridProps) {
  const [products, setProducts] = useState<StoreProduct[]>(initialProducts);
  const [source, setSource] = useState<"printful" | "fallback" | "loading">(
    "loading",
  );
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch("/api/products/feed", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as FeedResponse;
        if (cancelled) return;

        if (Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          setSource(data.source);
          setNote(data.message ?? null);
        } else {
          setProducts(initialProducts);
          setSource("fallback");
          setNote("Empty Printful feed — showing local catalog.");
        }
      } catch {
        if (cancelled) return;
        setProducts(initialProducts);
        setSource("fallback");
        setNote(
          "Could not reach the product feed — showing local catalog.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialProducts]);

  const statusLabel = useMemo(() => {
    if (source === "loading") return "Syncing Printful catalog…";
    if (source === "printful") return "Live from Printful";
    return "Local catalog fallback";
  }, [source]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
          {statusLabel}
        </p>
        {note ? (
          <p className="max-w-xl font-sans text-xs text-brand-muted">{note}</p>
        ) : null}
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      {!products.length ? (
        <div className="border border-dashed border-brand-muted/40 bg-surface-elevated px-6 py-12 text-center">
          <Image
            src="/branding/logo-original-transparent.svg"
            alt="Vitality Sweat"
            width={140}
            height={40}
            className="mx-auto h-10 w-auto opacity-70"
          />
          <p className="mt-4 font-sans text-sm text-brand-muted">
            No products available right now. Check back soon.
          </p>
        </div>
      ) : null}
    </div>
  );
}
