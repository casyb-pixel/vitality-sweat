"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/store/CartProvider";
import { formatMoney } from "@/lib/store/cart";

type FieldErrors = Record<string, string>;

export default function CheckoutForm() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";
  const { items, subtotalCents } = useCart();
  const currency = items[0]?.currency || "USD";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const canCheckout = useMemo(
    () => items.length > 0 && items.every((item) => Boolean(item.variantId)),
    [items],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!canCheckout) {
      setError("Your cart has items that cannot be fulfilled. Return to the store and refresh.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const shipping = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim() || undefined,
      address1: String(form.get("address1") || "").trim(),
      address2: String(form.get("address2") || "").trim() || undefined,
      city: String(form.get("city") || "").trim(),
      state: String(form.get("state") || "").trim(),
      country: String(form.get("country") || "US").trim().toUpperCase(),
      zip: String(form.get("zip") || "").trim(),
    };

    const nextErrors: FieldErrors = {};
    for (const key of ["name", "email", "address1", "city", "state", "zip"] as const) {
      if (!shipping[key]) nextErrors[key] = "Required";
    }
    if (shipping.email && !shipping.email.includes("@")) {
      nextErrors.email = "Enter a valid email";
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            currency: item.currency,
            size: item.size,
            color: item.color,
            image: item.image,
            sku: item.sku,
          })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.checkoutUrl) {
        setError(
          data.message ||
            data.error ||
            "Checkout could not start. Check Stripe and Printful configuration.",
        );
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error starting checkout. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!items.length) {
    return (
      <div className="site-shell section-y">
        <h1 className="font-display text-3xl text-brand-ink">Checkout</h1>
        <p className="mt-3 font-sans text-brand-muted">Your cart is empty.</p>
        <Link
          href="/store"
          className="mt-6 inline-flex bg-brand-orange px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white"
        >
          Browse store
        </Link>
      </div>
    );
  }

  return (
    <div className="site-shell section-y">
      <p className="eyebrow text-brand-orange">Secure checkout</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] text-brand-ink">
        Shipping details
      </h1>
      <p className="mt-2 max-w-2xl font-sans text-brand-muted">
        Enter your address, then continue to Stripe to pay. Printful prints and
        ships after payment clears.
      </p>

      {cancelled ? (
        <p className="mt-4 border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 font-sans text-sm text-brand-ink">
          Payment was cancelled. Your cart items are still here if you want to try again.
        </p>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={onSubmit} className="space-y-4 border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
          {(
            [
              ["name", "Full name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone (optional)", "tel"],
              ["address1", "Address", "text"],
              ["address2", "Apartment, suite (optional)", "text"],
              ["city", "City", "text"],
              ["state", "State", "text"],
              ["zip", "ZIP", "text"],
            ] as const
          ).map(([name, label, type]) => (
            <label key={name} className="block">
              <span className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-brand-muted">
                {label}
              </span>
              <input
                name={name}
                type={type}
                className="w-full border border-brand-ink/15 bg-surface px-3 py-3 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange"
                autoComplete={
                  name === "name"
                    ? "name"
                    : name === "email"
                      ? "email"
                      : name === "phone"
                        ? "tel"
                        : name === "address1"
                          ? "address-line1"
                          : name === "address2"
                            ? "address-line2"
                            : name === "city"
                              ? "address-level2"
                              : name === "state"
                                ? "address-level1"
                                : "postal-code"
                }
              />
              {fieldErrors[name] ? (
                <span className="mt-1 block font-sans text-xs text-red-600">
                  {fieldErrors[name]}
                </span>
              ) : null}
            </label>
          ))}

          <label className="block">
            <span className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Country
            </span>
            <select
              name="country"
              defaultValue="US"
              className="w-full border border-brand-ink/15 bg-surface px-3 py-3 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>

          {error ? (
            <p className="border border-red-200 bg-red-50 px-3 py-3 font-sans text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center bg-brand-orange px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
          >
            {pending ? "Starting checkout…" : "Pay with Stripe"}
          </button>
        </form>

        <aside className="h-fit border border-brand-ink/10 bg-surface-elevated p-5">
          <h2 className="font-display text-2xl text-brand-ink">Order</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.key} className="flex justify-between gap-3 font-sans text-sm">
                <span className="text-brand-ink">
                  {item.name}
                  <span className="block text-xs text-brand-muted">
                    {[item.color, item.size, `×${item.quantity}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-brand-ink">
                  {formatMoney(
                    Math.round(Number.parseFloat(item.unitPrice) * 100) *
                      item.quantity,
                    item.currency,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-brand-ink/10 pt-4 font-sans text-sm">
            <span className="text-brand-muted">Subtotal</span>
            <span className="font-semibold text-brand-ink">
              {formatMoney(subtotalCents, currency)}
            </span>
          </div>
          <Link
            href="/store/cart"
            className="mt-4 inline-flex font-sans text-xs font-semibold uppercase tracking-wide text-brand-orange"
          >
            Edit cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
