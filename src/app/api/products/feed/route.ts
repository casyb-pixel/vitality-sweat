import { NextResponse } from "next/server";
import {
  fetchPrintfulStorefrontCatalog,
  getPrintfulApiKey,
  PrintfulApiError,
  type StorefrontProduct,
} from "@/lib/printful";
import {
  buildMerchantFeed,
  MERCHANT_CENTER,
  type MerchantFeedItem,
} from "@/lib/store/merchant-feed";
import { STORE_PRODUCTS, type StoreProduct } from "@/lib/store/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedProduct =
  | StorefrontProduct
  | (StoreProduct & {
      colors?: string[];
      mockups?: string[];
      source?: string;
    });

export type ProductFeedResponse = {
  ok: boolean;
  source: "printful" | "fallback";
  /** Google Merchant Center account mapping (placeholder → live Shopping feed). */
  merchantCenter: typeof MERCHANT_CENTER;
  products: FeedProduct[];
  /** Optimized Merchant Center–shaped rows derived from the product catalog. */
  merchantFeed: MerchantFeedItem[];
  message?: string;
  error?: string;
  rateLimited?: boolean;
};

function fallbackProducts(): FeedProduct[] {
  return STORE_PRODUCTS.map((p) => ({
    ...p,
    colors: p.colors ?? [],
    mockups: [p.image],
    source: "fallback",
  }));
}

function buildPayload(
  products: FeedProduct[],
  source: "printful" | "fallback",
  message: string,
  extra?: Partial<ProductFeedResponse>,
): ProductFeedResponse {
  return {
    ok: true,
    source,
    merchantCenter: MERCHANT_CENTER,
    products,
    merchantFeed: buildMerchantFeed(products),
    message,
    ...extra,
  };
}

/**
 * GET /api/products/feed
 * Returns Printful sync products (hoodie variants, colors, pricing, mockups)
 * plus a Google Merchant Center–mapped feed scaffold (merchant ID 5399686038).
 */
export async function GET() {
  if (!getPrintfulApiKey()) {
    return NextResponse.json(
      buildPayload(
        fallbackProducts(),
        "fallback",
        "PRINTFUL_API_KEY missing — serving local fallback catalog.",
      ),
      { status: 200 },
    );
  }

  try {
    const products = await fetchPrintfulStorefrontCatalog();
    if (!products.length) {
      return NextResponse.json(
        buildPayload(
          fallbackProducts(),
          "fallback",
          "Printful returned no active products — serving local fallback catalog.",
        ),
      );
    }

    return NextResponse.json(
      buildPayload(
        products,
        "printful",
        `Synced ${products.length} Printful product(s); merchant feed mapped for ${MERCHANT_CENTER.merchantId}.`,
      ),
    );
  } catch (error) {
    const rateLimited =
      error instanceof PrintfulApiError && error.status === 429;
    const timedOut =
      error instanceof PrintfulApiError && error.status === 504;
    const message =
      error instanceof PrintfulApiError
        ? error.message
        : "Unexpected Printful feed error.";

    return NextResponse.json(
      buildPayload(
        fallbackProducts(),
        "fallback",
        rateLimited
          ? "Printful rate limit hit — serving local fallback catalog."
          : timedOut
            ? "Printful timed out — serving local fallback catalog."
            : `${message} Serving local fallback catalog.`,
        {
          ok: false,
          error: message,
          rateLimited,
        },
      ),
      { status: 200 },
    );
  }
}
