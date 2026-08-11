import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import CheckoutForm from "@/components/store/CheckoutForm";
import { buildCanonical, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Checkout",
  description: `Checkout securely for ${SITE_NAME} merchandise.`,
  alternates: { canonical: buildCanonical("/store/checkout") },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <div className="bg-surface">
        <Suspense
          fallback={
            <div className="site-shell section-y font-sans text-brand-muted">
              Loading checkout…
            </div>
          }
        >
          <CheckoutForm />
        </Suspense>
      </div>
      <SiteFooter />
    </>
  );
}
