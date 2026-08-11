import {
  fetchPrintfulStorefrontCatalog,
  getPrintfulApiKey,
  type StorefrontProduct,
} from "@/lib/printful";
import {
  getFeaturedGear,
  STORE_PRODUCTS,
  type StoreProduct,
} from "@/lib/store/products";

export type StoreCatalogResult = {
  products: StoreProduct[];
  source: "printful" | "fallback";
  message: string;
};

function asStoreProducts(products: StorefrontProduct[]): StoreProduct[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    image: product.image,
    imageAlt: product.imageAlt,
    price: product.price,
    currency: product.currency,
    sku: product.sku,
    category: product.category,
    sizes: product.sizes,
    colors: product.colors,
    mockups: product.mockups,
    variants: product.variants,
    featured: product.featured,
    source: product.source,
    availability: product.availability,
  }));
}

function fallbackCatalog(message: string): StoreCatalogResult {
  return {
    products: STORE_PRODUCTS.map((product) => ({
      ...product,
      colors: product.colors ?? [],
      mockups: product.mockups?.length ? product.mockups : [product.image],
      source: "fallback",
    })),
    source: "fallback",
    message,
  };
}

/**
 * Server-side store catalog. Prefer Printful; fall back to local placeholders
 * only when the live feed is unavailable.
 */
export async function getStorefrontCatalog(): Promise<StoreCatalogResult> {
  if (!getPrintfulApiKey()) {
    return fallbackCatalog(
      "PRINTFUL_API_KEY missing — serving local fallback catalog.",
    );
  }

  try {
    const products = await fetchPrintfulStorefrontCatalog();
    if (!products.length) {
      return fallbackCatalog(
        "Printful returned no active products — serving local fallback catalog.",
      );
    }

    return {
      products: asStoreProducts(products),
      source: "printful",
      message: `Synced ${products.length} Printful product(s).`,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Printful catalog unavailable.";
    return fallbackCatalog(`${detail} — serving local fallback catalog.`);
  }
}

/** Featured merch for blog/home modules, using the live catalog when possible. */
export async function getLiveFeaturedGear(limit = 4): Promise<StoreProduct[]> {
  const catalog = await getStorefrontCatalog();
  if (catalog.source === "printful") {
    const featured = catalog.products.filter((product) => product.featured);
    const pool = featured.length ? featured : catalog.products;
    return pool.slice(0, limit);
  }
  return getFeaturedGear(limit);
}
