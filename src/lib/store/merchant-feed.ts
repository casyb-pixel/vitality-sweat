import type { StorefrontProduct } from "@/lib/printful";
import type { StoreProduct, StoreProductVariant } from "@/lib/store/products";
import { productPath } from "@/lib/store/product-slug";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";
import { stripEmDashes } from "@/lib/text/humanize-copy";

/** Google Merchant Center account for Vitality Sweat. */
export const GOOGLE_MERCHANT_CENTER_ID = "5399686038";

export type MerchantCenterConfig = {
  merchantId: string;
  brand: string;
  currencyDefault: string;
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

/** Matches current Stripe checkout (`shipping_cents: 0`). */
export const MERCHANT_SHIPPING_TSV = "US::Standard:0.00 USD";

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
  size: string;
  color: string;
  itemGroupId: string;
  merchantId: string;
  identifierExists: false;
  shipping: string;
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
  variants?: StoreProductVariant[];
  source?: string;
};

function mapAvailability(
  schemaAvailability: string,
): MerchantFeedItem["availability"] {
  if (schemaAvailability.includes("PreOrder")) return "preorder";
  if (schemaAvailability.includes("OutOfStock")) return "out_of_stock";
  return "in_stock";
}

export function googleProductCategoryFor(product: FeedableProduct): string {
  const haystack = `${product.name} ${product.category}`.toLowerCase();
  if (haystack.includes("beanie") || haystack.includes("hat") || haystack.includes("cap")) {
    return "Apparel & Accessories > Clothing Accessories > Hats";
  }
  if (haystack.includes("hoodie") || haystack.includes("sweatshirt")) {
    return "Apparel & Accessories > Clothing > Shirts & Tops";
  }
  if (haystack.includes("tee") || haystack.includes("t-shirt") || haystack.includes("shirt")) {
    return "Apparel & Accessories > Clothing > Shirts & Tops";
  }
  if (haystack.includes("bottle") || haystack.includes("accessories")) {
    return "Sporting Goods > Outdoor Recreation > Camping & Hiking > Hydration";
  }
  return "Apparel & Accessories > Clothing";
}

function absoluteImage(url: string): string {
  return url.startsWith("http") ? url : absoluteUrl(url);
}

function baseItem(
  product: FeedableProduct,
  overrides: Partial<MerchantFeedItem> & Pick<MerchantFeedItem, "offerId" | "price">,
): MerchantFeedItem {
  const extraImages = (product.mockups ?? []).filter(
    (url) => url && url !== product.image,
  );
  return {
    offerId: overrides.offerId,
    title: stripEmDashes(product.name),
    description: stripEmDashes(product.description),
    link: absoluteUrl(productPath(product)),
    imageLink: absoluteImage(overrides.imageLink ?? product.image),
    additionalImageLinks: extraImages.map(absoluteImage),
    availability: mapAvailability(product.availability),
    price: overrides.price,
    brand: MERCHANT_CENTER.brand,
    condition: "new",
    googleProductCategory: googleProductCategoryFor(product),
    productTypes: [product.category || "Apparel"],
    size: overrides.size ?? "",
    color: overrides.color ?? "",
    itemGroupId: product.id,
    merchantId: MERCHANT_CENTER.merchantId,
    identifierExists: false,
    shipping: MERCHANT_SHIPPING_TSV,
  };
}

export function mapProductToMerchantFeedItems(
  product: FeedableProduct,
): MerchantFeedItem[] {
  const currency = product.currency || MERCHANT_CENTER.currencyDefault;
  const variants = product.variants ?? [];

  if (variants.length > 0) {
    return variants.map((variant) =>
      baseItem(product, {
        offerId: variant.sku || variant.id,
        price: `${variant.price || product.price} ${variant.currency || currency}`,
        size: variant.size || "",
        color: variant.color || "",
        imageLink: variant.mockupUrl || product.image,
      }),
    );
  }

  return [
    baseItem(product, {
      offerId: product.sku || product.id,
      price: `${product.price} ${currency}`,
      size: product.sizes?.[0] || "",
      color: product.colors?.[0] || "",
    }),
  ];
}

/** One row per product group (first variant). Used by the JSON API scaffold. */
export function mapProductToMerchantFeedItem(
  product: FeedableProduct,
): MerchantFeedItem {
  return mapProductToMerchantFeedItems(product)[0];
}

export function buildMerchantFeed(
  products: FeedableProduct[],
): MerchantFeedItem[] {
  return products.flatMap(mapProductToMerchantFeedItems);
}

/** Shopping-safe rows: live Printful stock only, no placeholder catalog. */
export function buildPublishableMerchantFeed(
  products: FeedableProduct[],
): MerchantFeedItem[] {
  return products
    .filter((product) => product.source === "printful")
    .flatMap(mapProductToMerchantFeedItems)
    .filter((row) => row.availability === "in_stock");
}

const TSV_COLUMNS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "price",
  "brand",
  "condition",
  "google_product_category",
  "product_type",
  "item_group_id",
  "color",
  "size",
  "identifier_exists",
  "shipping",
] as const;

function tsvCell(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
}

export function merchantFeedToTsv(items: MerchantFeedItem[]): string {
  const header = TSV_COLUMNS.join("\t");
  const rows = items.map((item) =>
    [
      item.offerId,
      item.title,
      item.description,
      item.link,
      item.imageLink,
      item.additionalImageLinks.join(","),
      item.availability,
      item.price,
      item.brand,
      item.condition,
      item.googleProductCategory,
      item.productTypes[0] || "",
      item.itemGroupId,
      item.color,
      item.size,
      "FALSE",
      item.shipping,
    ]
      .map(tsvCell)
      .join("\t"),
  );
  return [header, ...rows].join("\n");
}
