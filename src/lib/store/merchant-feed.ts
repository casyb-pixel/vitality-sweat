import type { StorefrontProduct } from "@/lib/printful";
import type { StoreProduct } from "@/lib/store/products";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";

/** Google Merchant Center account for Vitality Sweat. */
export const GOOGLE_MERCHANT_CENTER_ID = "5399686038";

export type MerchantCenterConfig = {
  merchantId: string;
  brand: string;
  currencyDefault: string;
  /** Placeholder channel until Shopping feed publish is wired. */
  channel: "online";
  contentLanguage: "en";
  targetCountry: "US";
};

export const MERCHANT_CENTER: MerchantCenterConfig = {
  merchantId: GOOGLE_MERCHANT_CENTER_ID,
  brand: SITE_NAME,
  currencyDefault: "USD",
  channel: "online",
  contentLanguage: "en",
  targetCountry: "US",
};

/**
 * Google Merchant / Content API–shaped product row (placeholder mapping).
 * Expand with GTIN, shipping, and tax attributes when catalog is finalized.
 */
export type MerchantFeedItem = {
  offerId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: "in_stock" | "out_of_stock" | "preorder";
  price: string;
  brand: string;
  condition: "new";
  googleProductCategory: string;
  productTypes: string[];
  sizes: string[];
  colors: string[];
  itemGroupId: string;
  merchantId: string;
};

type FeedableProduct = Pick<
  StoreProduct | StorefrontProduct,
  | "id"
  | "name"
  | "description"
  | "image"
  | "price"
  | "currency"
  | "sku"
  | "category"
  | "sizes"
  | "availability"
> & {
  colors?: string[];
  mockups?: string[];
};

function mapAvailability(
  schemaAvailability: string,
): MerchantFeedItem["availability"] {
  if (schemaAvailability.includes("PreOrder")) return "preorder";
  if (schemaAvailability.includes("OutOfStock")) return "out_of_stock";
  return "in_stock";
}

export function mapProductToMerchantFeedItem(
  product: FeedableProduct,
): MerchantFeedItem {
  const currency = product.currency || MERCHANT_CENTER.currencyDefault;
  const extraImages = (product.mockups ?? []).filter(
    (url) => url && url !== product.image,
  );

  return {
    offerId: product.sku || product.id,
    title: product.name,
    description: product.description,
    link: absoluteUrl(`/store#${product.id}`),
    imageLink: product.image.startsWith("http")
      ? product.image
      : absoluteUrl(product.image),
    additionalImageLinks: extraImages.map((url) =>
      url.startsWith("http") ? url : absoluteUrl(url),
    ),
    availability: mapAvailability(product.availability),
    price: `${product.price} ${currency}`,
    brand: MERCHANT_CENTER.brand,
    condition: "new",
    googleProductCategory: "Apparel & Accessories > Clothing",
    productTypes: [product.category || "Apparel"],
    sizes: product.sizes ?? [],
    colors: product.colors ?? [],
    itemGroupId: product.id,
    merchantId: MERCHANT_CENTER.merchantId,
  };
}

export function buildMerchantFeed(
  products: FeedableProduct[],
): MerchantFeedItem[] {
  return products.map(mapProductToMerchantFeedItem);
}
