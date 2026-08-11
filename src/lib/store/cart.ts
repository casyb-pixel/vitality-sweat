export type CartVariant = {
  id: string;
  size: string;
  color: string;
  price: string;
  mockupUrl?: string | null;
};

export type CartProductInput = {
  id: string;
  name: string;
  image: string;
  currency: string;
  source?: string;
  variants?: CartVariant[];
};

export type CartLineItem = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPrice: string;
  currency: string;
  quantity: number;
  source: string;
  sku?: string;
};

export type CheckoutShippingAddress = {
  name: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
};

export const CART_STORAGE_KEY = "vs_store_cart_v1";

export function cartLineKey(
  productId: string,
  variantId: string | null,
  size: string,
  color: string,
): string {
  return [productId, variantId ?? "none", size, color].join("::");
}

export function resolveVariant(
  product: CartProductInput,
  size: string,
  color: string,
): CartVariant | null {
  const variants = product.variants ?? [];
  if (!variants.length) return null;

  const exact = variants.find(
    (v) =>
      v.size.toLowerCase() === size.toLowerCase() &&
      v.color.toLowerCase() === color.toLowerCase(),
  );
  if (exact) return exact;

  const bySize = variants.find(
    (v) => v.size.toLowerCase() === size.toLowerCase(),
  );
  return bySize ?? variants[0] ?? null;
}

export function buildCartLine(
  product: CartProductInput,
  size: string,
  color: string,
  quantity = 1,
): CartLineItem {
  const variant = resolveVariant(product, size, color);
  const resolvedSize = variant?.size || size || "One Size";
  const resolvedColor = variant?.color || color || "Default";
  const unitPrice = variant?.price || "0.00";
  const variantId = variant?.id ?? null;

  return {
    key: cartLineKey(product.id, variantId, resolvedSize, resolvedColor),
    productId: product.id,
    variantId,
    name: product.name,
    image: variant?.mockupUrl || product.image,
    size: resolvedSize,
    color: resolvedColor,
    unitPrice,
    currency: product.currency || "USD",
    quantity: Math.max(1, quantity),
    source: product.source || "fallback",
  };
}

export function cartSubtotalCents(items: CartLineItem[]): number {
  return items.reduce((sum, item) => {
    const price = Number.parseFloat(item.unitPrice);
    if (!Number.isFinite(price)) return sum;
    return sum + Math.round(price * 100) * item.quantity;
  }, 0);
}

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
