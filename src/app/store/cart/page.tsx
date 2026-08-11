import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import CartPageClient from "@/components/store/CartPageClient";
import { buildCanonical, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Cart",
  description: `Review items in your ${SITE_NAME} cart before checkout.`,
  alternates: { canonical: buildCanonical("/store/cart") },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <Navbar />
      <div className="bg-surface">
        <CartPageClient />
      </div>
      <SiteFooter />
    </>
  );
}
