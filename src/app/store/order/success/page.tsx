import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import OrderSuccessClient from "@/components/store/OrderSuccessClient";
import { buildCanonical, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Order confirmed",
  description: `Your ${SITE_NAME} order confirmation.`,
  alternates: { canonical: buildCanonical("/store/order/success") },
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  return (
    <>
      <Navbar />
      <div className="bg-surface">
        <Suspense
          fallback={
            <div className="site-shell section-y font-sans text-brand-muted">
              Confirming your order…
            </div>
          }
        >
          <OrderSuccessClient />
        </Suspense>
      </div>
      <SiteFooter />
    </>
  );
}
