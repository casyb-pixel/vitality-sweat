"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/store/CartProvider";
import { formatMoney } from "@/lib/store/cart";

export default function CartPageClient() {
  const { items, itemCount, subtotalCents, setQuantity, removeItem } = useCart();
  const currency = items[0]?.currency || "USD";

  return (
    <div className="site-shell section-y">
      <p className="eyebrow text-brand-orange">Store</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] text-brand-ink">
        Your cart
      </h1>
      <p className="mt-2 font-sans text-brand-muted">
        {itemCount} {itemCount === 1 ? "item" : "items"} ready for checkout.
      </p>

      {!items.length ? (
        <div className="mt-10 border border-dashed border-brand-muted/40 bg-surface-elevated px-6 py-12 text-center">
          <p className="font-sans text-sm text-brand-muted">Your cart is empty.</p>
          <Link
            href="/store"
            className="mt-5 inline-flex bg-brand-orange px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-4 border border-brand-ink/10 bg-surface-elevated p-4 sm:flex-row"
              >
                <div className="relative h-28 w-full shrink-0 overflow-hidden bg-brand-ink/5 sm:h-28 sm:w-28">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized={item.image.startsWith("http")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl text-brand-ink">{item.name}</h2>
                  <p className="mt-1 font-sans text-sm text-brand-muted">
                    {[item.color, item.size].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-2 font-sans text-base font-semibold text-brand-ink">
                    {formatMoney(
                      Math.round(Number.parseFloat(item.unitPrice) * 100),
                      item.currency,
                    )}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 w-9 border border-brand-ink/15"
                      onClick={() => setQuantity(item.key, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center font-sans text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="h-9 w-9 border border-brand-ink/15"
                      onClick={() => setQuantity(item.key, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-auto font-sans text-xs font-semibold uppercase tracking-wide text-brand-muted hover:text-brand-orange"
                      onClick={() => removeItem(item.key)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit border border-brand-ink/10 bg-surface-elevated p-5">
            <h2 className="font-display text-2xl text-brand-ink">Summary</h2>
            <div className="mt-4 flex items-center justify-between font-sans text-sm">
              <span className="text-brand-muted">Subtotal</span>
              <span className="font-semibold text-brand-ink">
                {formatMoney(subtotalCents, currency)}
              </span>
            </div>
            <p className="mt-3 font-sans text-xs text-brand-muted">
              Shipping is handled by Printful after payment.
            </p>
            <Link
              href="/store/checkout"
              className="mt-5 inline-flex w-full items-center justify-center bg-brand-orange px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
            >
              Checkout
            </Link>
            <Link
              href="/store"
              className="mt-2 inline-flex w-full items-center justify-center border border-brand-ink/15 px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink hover:border-brand-orange"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
