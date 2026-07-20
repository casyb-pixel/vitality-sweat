import { NextResponse } from "next/server";
import {
  fetchPrintfulStorefrontCatalog,
  getPrintfulApiKey,
  PrintfulApiError,
  type StorefrontProduct,
} from "@/lib/printful";
import { STORE_PRODUCTS, type StoreProduct } from "@/lib/store/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ProductFeedResponse = {
  ok: boolean;
  source: "printful" | "fallback";
  products: Array<StorefrontProduct | (StoreProduct & { colors?: string[]; mockups?: string[]; source?: string })>;
  message?: string;
  error?: string;
  rateLimited?: boolean;
};

function fallbackPayload(message: string, extra?: Partial<ProductFeedResponse>): ProductFeedResponse {
  return {
    ok: true,
    source: "fallback",
    products: STORE_PRODUCTS.map((p) => ({
      ...p,
      colors: [],
      mockups: [p.image],
      source: "fallback",
    })),
    message,
    ...extra,
  };
}

/**
 * GET /api/products/feed
 * Returns Printful sync products (hoodie variants, colors, pricing, mockups)
 * or a local fallback catalog if Printful is unavailable.
 */
export async function GET() {
  if (!getPrintfulApiKey()) {
    return NextResponse.json(
      fallbackPayload(
        "PRINTFUL_API_KEY missing — serving local fallback catalog.",
      ),
      { status: 200 },
    );
  }

  try {
    const products = await fetchPrintfulStorefrontCatalog();
    if (!products.length) {
      return NextResponse.json(
        fallbackPayload(
          "Printful returned no active products — serving local fallback catalog.",
        ),
      );
    }

    return NextResponse.json({
      ok: true,
      source: "printful",
      products,
      message: `Synced ${products.length} Printful product(s).`,
    } satisfies ProductFeedResponse);
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
      fallbackPayload(
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
