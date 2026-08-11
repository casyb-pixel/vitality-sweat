import { NextResponse } from "next/server";
import {
  buildMerchantFeed,
  MERCHANT_CENTER,
  type MerchantFeedItem,
} from "@/lib/store/merchant-feed";
import { getStorefrontCatalog } from "@/lib/store/catalog";
import type { StoreProduct } from "@/lib/store/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ProductFeedResponse = {
  ok: boolean;
  source: "printful" | "fallback";
  /** Google Merchant Center account mapping (placeholder → live Shopping feed). */
  merchantCenter: typeof MERCHANT_CENTER;
  products: StoreProduct[];
  /** Optimized Merchant Center–shaped rows derived from the product catalog. */
  merchantFeed: MerchantFeedItem[];
  message?: string;
  error?: string;
};

/**
 * GET /api/products/feed
 * Returns Printful sync products (hoodie variants, colors, pricing, mockups)
 * plus a Google Merchant Center–mapped feed scaffold.
 */
export async function GET() {
  const catalog = await getStorefrontCatalog();
  const payload: ProductFeedResponse = {
    ok: catalog.source === "printful",
    source: catalog.source,
    merchantCenter: MERCHANT_CENTER,
    products: catalog.products,
    merchantFeed: buildMerchantFeed(catalog.products),
    message:
      catalog.source === "printful"
        ? `${catalog.message} Merchant feed mapped for ${MERCHANT_CENTER.merchantId}.`
        : catalog.message,
    ...(catalog.source === "fallback" ? { error: catalog.message } : {}),
  };

  return NextResponse.json(payload, { status: 200 });
}
