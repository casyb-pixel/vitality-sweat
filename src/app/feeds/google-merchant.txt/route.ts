import { NextResponse } from "next/server";
import { getStorefrontCatalog } from "@/lib/store/catalog";
import {
  buildPublishableMerchantFeed,
  merchantFeedToTsv,
} from "@/lib/store/merchant-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public Google Merchant Center text feed.
 * Keep this path out of robots Disallow (/api/ is blocked).
 * Do not submit until GTINs or identifier_exists=FALSE plus shipping are accepted.
 */
export async function GET() {
  const catalog = await getStorefrontCatalog();
  const rows = buildPublishableMerchantFeed(catalog.products);
  const body = merchantFeedToTsv(rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Merchant-Feed-Source": catalog.source,
      "X-Merchant-Feed-Rows": String(rows.length),
    },
  });
}
