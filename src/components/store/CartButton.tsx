"use client";

import { useCart } from "@/components/store/CartProvider";

type CartButtonProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function CartButton({ className = "", onNavigate }: CartButtonProps) {
  const { itemCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        openCart();
      }}
      className={`relative inline-flex items-center justify-center font-sans text-sm font-semibold tracking-wide text-brand-ink transition-colors hover:text-brand-orange ${className}`}
      aria-label={`Open cart${itemCount ? `, ${itemCount} items` : ""}`}
    >
      Cart
      {itemCount > 0 ? (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center bg-brand-orange px-1.5 py-0.5 font-sans text-[0.65rem] font-bold text-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button>
  );
}
