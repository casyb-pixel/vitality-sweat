import type { StoreProduct } from "@/lib/store/products";

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productSlug(product: Pick<StoreProduct, "id" | "name">): string {
  return slugifyProductName(product.name) || product.id;
}

export function productPath(product: Pick<StoreProduct, "id" | "name">): string {
  return `/store/${productSlug(product)}`;
}

export function findProductBySlug(
  products: StoreProduct[],
  slug: string,
): StoreProduct | undefined {
  const needle = slug.trim().toLowerCase();
  if (!needle) return undefined;
  return products.find(
    (product) =>
      productSlug(product) === needle ||
      product.id.toLowerCase() === needle ||
      product.id.replace(/^printful-/i, "") === needle,
  );
}
