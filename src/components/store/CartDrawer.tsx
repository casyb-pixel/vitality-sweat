"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/store/CartProvider";
import { formatMoney } from "@/lib/store/cart";

export default function CartDrawer() {
  const {
    items,
    itemCount,
    subtotalCents,
    isOpen,
    closeCart,
    setQuantity,
    removeItem,
  } = useCart();

  const currency = items[0]?.currency || "USD";

  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        className={`fixed inset-0 z-[60] bg-brand-ink/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />
      <aside
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-brand-ink/10 bg-surface-elevated shadow-[-12px_0_40px_rgba(64,64,64,0.12)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-brand-ink/10 px-5 py-4">
          <div>
            <p className="eyebrow text-brand-orange">Your cart</p>
            <h2 className="font-display text-2xl text-brand-ink">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex h-10 w-10 items-center justify-center border border-brand-ink/15 font-sans text-lg text-brand-ink hover:border-brand-orange"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!items.length ? (
            <div className="py-12 text-center">
              <p className="font-sans text-sm text-brand-muted">
                Your cart is empty. Grab some training gear.
              </p>
              <Link
                href="/store"
                onClick={closeCart}
                className="mt-5 inline-flex bg-brand-orange px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
              >
                Browse store
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex gap-3 border border-brand-ink/10 bg-surface p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-brand-ink/5">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={item.image.startsWith("http")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-semibold text-brand-ink">
                      {item.name}
                    </p>
                    <p className="mt-0.5 font-sans text-xs text-brand-muted">
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 font-sans text-sm font-semibold text-brand-ink">
                      {formatMoney(
                        Math.round(Number.parseFloat(item.unitPrice) * 100),
                        item.currency,
                      )}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 border border-brand-ink/15 font-sans text-sm"
                        onClick={() =>
                          setQuantity(item.key, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-sans text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-8 w-8 border border-brand-ink/15 font-sans text-sm"
                        onClick={() =>
                          setQuantity(item.key, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
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
          )}
        </div>

        {items.length > 0 ? (
          <div className="border-t border-brand-ink/10 px-5 py-4">
            <div className="mb-4 flex items-center justify-between font-sans text-sm">
              <span className="text-brand-muted">Subtotal</span>
              <span className="font-semibold text-brand-ink">
                {formatMoney(subtotalCents, currency)}
              </span>
            </div>
            <p className="mb-3 font-sans text-xs text-brand-muted">
              Shipping calculated at checkout. Taxes may apply.
            </p>
            <Link
              href="/store/checkout"
              onClick={closeCart}
              className="inline-flex w-full items-center justify-center bg-brand-orange px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
            >
              Checkout
            </Link>
            <Link
              href="/store/cart"
              onClick={closeCart}
              className="mt-2 inline-flex w-full items-center justify-center border border-brand-ink/15 px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink hover:border-brand-orange"
            >
              View cart
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
