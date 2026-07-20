/**
 * Printful store synchronizer — sync products / variants for the Vitality Sweat storefront.
 * Auth: PRINTFUL_API_KEY (Bearer). Optional: PRINTFUL_STORE_ID → X-PF-Store-Id.
 */

export const PRINTFUL_API_BASE = "https://api.printful.com";

export type PrintfulSyncProductSummary = {
  id: number;
  external_id?: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url?: string | null;
  is_ignored?: boolean;
};

export type PrintfulSyncVariant = {
  id: number;
  external_id?: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  sku?: string | null;
  currency: string;
  is_ignored?: boolean;
  size?: string | null;
  color?: string | null;
  availability_status?: string;
  product?: {
    variant_id: number;
    product_id: number;
    image?: string | null;
    name?: string;
  };
  files?: Array<{
    id: number;
    type: string;
    preview_url?: string | null;
    thumbnail_url?: string | null;
    filename?: string;
  }>;
};

export type PrintfulSyncProductDetail = {
  sync_product: PrintfulSyncProductSummary;
  sync_variants: PrintfulSyncVariant[];
};

export type PrintfulListItem = {
  id: number;
  external_id?: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url?: string | null;
  is_ignored?: boolean;
};

type PrintfulEnvelope<T> = {
  code: number;
  result: T;
  error?: string;
};

export class PrintfulApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body = "") {
    super(message);
    this.name = "PrintfulApiError";
    this.status = status;
    this.body = body;
  }
}

export function getPrintfulApiKey(): string | undefined {
  const key = process.env.PRINTFUL_API_KEY?.trim();
  return key || undefined;
}

export function getPrintfulStoreId(): string | undefined {
  const id = process.env.PRINTFUL_STORE_ID?.trim();
  return id || undefined;
}

function buildHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "User-Agent": "VitalitySweat-Storefront/1.0",
  };
  const storeId = getPrintfulStoreId();
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  return headers;
}

async function printfulFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const apiKey = getPrintfulApiKey();
  if (!apiKey) {
    throw new PrintfulApiError(
      "PRINTFUL_API_KEY is not configured on the server.",
      503,
    );
  }

  const timeoutMs = init?.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${PRINTFUL_API_BASE}${path}`, {
      ...init,
      headers: {
        ...buildHeaders(apiKey),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
      // Always revalidate periodically — catalog can change in Printful dashboard
      next: { revalidate: 300 },
    });

    const text = await res.text();
    if (!res.ok) {
      throw new PrintfulApiError(
        `Printful request failed (${res.status}) for ${path}`,
        res.status,
        text.slice(0, 500),
      );
    }

    const json = JSON.parse(text) as PrintfulEnvelope<T>;
    return json.result;
  } catch (error) {
    if (error instanceof PrintfulApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PrintfulApiError(
        "Printful request timed out.",
        504,
      );
    }
    const message =
      error instanceof Error ? error.message : "Printful network error.";
    throw new PrintfulApiError(message, 502);
  } finally {
    clearTimeout(timer);
  }
}

/** List active sync products in the connected Printful store. */
export async function listSyncProducts(limit = 20): Promise<PrintfulListItem[]> {
  const result = await printfulFetch<PrintfulListItem[] | { items: PrintfulListItem[] }>(
    `/store/products?limit=${limit}`,
  );
  if (Array.isArray(result)) return result;
  return result.items ?? [];
}

/** Full sync product + variants (colors, sizes, pricing, mockups). */
export async function getSyncProduct(
  id: number,
): Promise<PrintfulSyncProductDetail> {
  return printfulFetch<PrintfulSyncProductDetail>(`/store/products/${id}`);
}

export type StorefrontVariant = {
  id: string;
  name: string;
  size: string;
  color: string;
  price: string;
  currency: string;
  sku: string;
  mockupUrl: string | null;
  availability: string;
};

export type StorefrontProduct = {
  id: string;
  printfulId: number;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  price: string;
  currency: string;
  sku: string;
  category: string;
  sizes: string[];
  colors: string[];
  variants: StorefrontVariant[];
  mockups: string[];
  featured: boolean;
  availability: "https://schema.org/InStock" | "https://schema.org/PreOrder";
  source: "printful";
};

function uniquePreserve(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!out.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      out.push(trimmed);
    }
  }
  return out;
}

function pickMockup(variant: PrintfulSyncVariant): string | null {
  const preview = variant.files?.find((f) => f.type === "preview");
  if (preview?.preview_url) return preview.preview_url;
  if (preview?.thumbnail_url) return preview.thumbnail_url;
  const anyPreview = variant.files?.find((f) => f.preview_url)?.preview_url;
  if (anyPreview) return anyPreview;
  return variant.product?.image ?? null;
}

function sizeSortKey(size: string): number {
  const order = ["XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL"];
  const idx = order.findIndex((s) => s.toLowerCase() === size.toLowerCase());
  return idx === -1 ? 100 : idx;
}

export function mapSyncProductToStorefront(
  detail: PrintfulSyncProductDetail,
): StorefrontProduct {
  const { sync_product, sync_variants } = detail;
  const active = sync_variants.filter(
    (v) => !v.is_ignored && (v.availability_status ?? "active") !== "discontinued",
  );
  const variants: StorefrontVariant[] = active.map((v) => ({
    id: String(v.id),
    name: v.name,
    size: v.size?.trim() || "One Size",
    color: v.color?.trim() || "Default",
    price: v.retail_price,
    currency: v.currency || "USD",
    sku: v.sku || String(v.id),
    mockupUrl: pickMockup(v),
    availability: v.availability_status || "active",
  }));

  const sizes = uniquePreserve(variants.map((v) => v.size)).sort(
    (a, b) => sizeSortKey(a) - sizeSortKey(b),
  );
  const colors = uniquePreserve(variants.map((v) => v.color));
  const mockups = uniquePreserve(
    [
      sync_product.thumbnail_url || "",
      ...variants.map((v) => v.mockupUrl || ""),
    ].filter(Boolean),
  );

  const prices = variants
    .map((v) => Number.parseFloat(v.price))
    .filter((n) => Number.isFinite(n));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const primary = variants[0];

  const isHoodie = /hoodie/i.test(sync_product.name);
  const description = isHoodie
    ? "Official Vitality Sweat unisex hoodie — Printful fulfillment with color and size variants ready for training days."
    : `Official Vitality Sweat merchandise synced from Printful (${variants.length} active variants).`;

  return {
    id: `printful-${sync_product.id}`,
    printfulId: sync_product.id,
    name: sync_product.name,
    description,
    image:
      sync_product.thumbnail_url ||
      mockups[0] ||
      "/images/stock/fitness/studio-group-stretch.jpg",
    imageAlt: `${sync_product.name} product mockup`,
    price: minPrice.toFixed(2),
    currency: primary?.currency || "USD",
    sku: primary?.sku || `PF-${sync_product.id}`,
    category: isHoodie ? "Apparel" : "Merchandise",
    sizes: sizes.length ? sizes : ["One Size"],
    colors,
    variants,
    mockups,
    featured: isHoodie,
    availability: "https://schema.org/InStock",
    source: "printful",
  };
}

/**
 * Pull the active Printful catalog and normalize for the storefront.
 * Prefers hoodie products first when present.
 */
export async function fetchPrintfulStorefrontCatalog(): Promise<
  StorefrontProduct[]
> {
  const list = await listSyncProducts(50);
  const active = list.filter((item) => !item.is_ignored);

  const details = await Promise.all(
    active.map(async (item) => {
      try {
        return await getSyncProduct(item.id);
      } catch {
        return null;
      }
    }),
  );

  const products = details
    .filter((d): d is PrintfulSyncProductDetail => Boolean(d))
    .map(mapSyncProductToStorefront);

  products.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  return products;
}
