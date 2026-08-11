"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildCartLine,
  CART_STORAGE_KEY,
  cartSubtotalCents,
  type CartLineItem,
  type CartProductInput,
} from "@/lib/store/cart";

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  subtotalCents: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (
    product: CartProductInput,
    size: string,
    color: string,
    quantity?: number,
  ) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLineItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.key === "string" &&
        typeof item.productId === "string" &&
        typeof item.quantity === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (
      product: CartProductInput,
      size: string,
      color: string,
      quantity = 1,
    ) => {
      const line = buildCartLine(product, size, color, quantity);
      setItems((prev) => {
        const existing = prev.find((item) => item.key === line.key);
        if (existing) {
          return prev.map((item) =>
            item.key === line.key
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }
        return [...prev, line];
      });
      setIsOpen(true);
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.key !== key);
      return prev.map((item) =>
        item.key === key ? { ...item, quantity } : item,
      );
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents: cartSubtotalCents(items),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((v) => !v),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, isOpen, addItem, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
