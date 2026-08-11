"use client";

import CartDrawer from "@/components/store/CartDrawer";
import { CartProvider } from "@/components/store/CartProvider";
import type { ReactNode } from "react";

export default function StoreCartShell({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
