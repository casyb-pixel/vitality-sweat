import { createServiceRoleClient } from "@/utils/supabase/admin";
import {
  createPrintfulOrder,
  findSyncVariantRetail,
  type PrintfulOrderItemInput,
} from "@/lib/printful";
import type { CheckoutShippingAddress } from "@/lib/store/cart";

export type CheckoutCartItem = {
  productId: string;
  variantId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  currency?: string;
  sku?: string;
  size?: string;
  color?: string;
  image?: string;
};

export type ValidatedCheckoutItem = CheckoutCartItem & {
  syncVariantId: number;
  retailPrice: string;
  currency: string;
  unitPriceCents: number;
};

export async function validateCheckoutItems(
  items: CheckoutCartItem[],
): Promise<
  | { ok: true; items: ValidatedCheckoutItem[]; subtotalCents: number; currency: string }
  | { ok: false; error: string }
> {
  if (!items.length) {
    return { ok: false, error: "Cart is empty." };
  }

  const validated: ValidatedCheckoutItem[] = [];

  for (const item of items) {
    if (!item.variantId || !/^\d+$/.test(item.variantId)) {
      return {
        ok: false,
        error: `${item.name} is not linked to a Printful variant. Refresh the store and try again.`,
      };
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return { ok: false, error: "Quantity must be between 1 and 20." };
    }

    const syncVariantId = Number.parseInt(item.variantId, 10);
    const live = await findSyncVariantRetail(syncVariantId);
    if (!live) {
      return {
        ok: false,
        error: `${item.name} is unavailable in Printful right now.`,
      };
    }

    const unitPriceCents = Math.round(Number.parseFloat(live.retail_price) * 100);
    if (!Number.isFinite(unitPriceCents) || unitPriceCents <= 0) {
      return { ok: false, error: `Invalid price for ${item.name}.` };
    }

    validated.push({
      ...item,
      syncVariantId,
      retailPrice: live.retail_price,
      currency: live.currency,
      unitPrice: live.retail_price,
      unitPriceCents,
      name: live.name || item.name,
      sku: live.sku || item.sku,
    });
  }

  const currency = validated[0]?.currency || "USD";
  const subtotalCents = validated.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  return { ok: true, items: validated, subtotalCents, currency };
}

export async function persistOrder(input: {
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  email: string;
  shipping: CheckoutShippingAddress;
  subtotalCents: number;
  totalCents: number;
  paymentProvider: "stripe" | "mock";
  fulfillmentProvider: "printful" | "mock";
  externalPaymentId?: string | null;
  externalFulfillmentId?: string | null;
  metadata?: Record<string, unknown>;
  items: ValidatedCheckoutItem[];
}): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      status: input.status,
      payment_status: input.paymentStatus,
      fulfillment_status: input.fulfillmentStatus,
      currency: input.currency,
      email: input.email,
      shipping_address: input.shipping,
      subtotal_cents: input.subtotalCents,
      shipping_cents: 0,
      tax_cents: 0,
      total_cents: input.totalCents,
      payment_provider: input.paymentProvider,
      fulfillment_provider: input.fulfillmentProvider,
      external_payment_id: input.externalPaymentId ?? null,
      external_fulfillment_id: input.externalFulfillmentId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !order?.id) {
    console.error("[orders] insert failed", error?.message);
    return null;
  }

  const rows = input.items.map((item) => ({
    order_id: order.id,
    product_external_id: item.productId,
    variant_external_id: item.variantId,
    sku: item.sku ?? null,
    name: item.name,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
    metadata: {
      size: item.size,
      color: item.color,
      syncVariantId: item.syncVariantId,
      retailPrice: item.retailPrice,
      image: item.image,
    },
  }));

  const { error: itemsError } = await admin.from("order_items").insert(rows);
  if (itemsError) {
    console.error("[order_items] insert failed", itemsError.message);
  }

  return order.id as string;
}

export async function attachStripeSessionToOrder(
  orderId: string,
  sessionId: string,
) {
  const admin = createServiceRoleClient();
  if (!admin) return;
  await admin
    .from("orders")
    .update({ external_payment_id: sessionId })
    .eq("id", orderId);
}

export async function updateOrderByPaymentId(
  externalPaymentId: string,
  patch: Record<string, unknown>,
) {
  const admin = createServiceRoleClient();
  if (!admin) return;
  await admin
    .from("orders")
    .update(patch)
    .eq("external_payment_id", externalPaymentId);
}

export async function loadOrderForFulfillment(sessionId: string): Promise<
  | {
      ok: true;
      orderId: string;
      shipping: CheckoutShippingAddress;
      items: ValidatedCheckoutItem[];
      alreadyFulfilled: boolean;
      printfulOrderId: string | null;
      currency: string;
    }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Order database is not configured (service role)." };
  }

  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, currency, shipping_address, external_fulfillment_id, fulfillment_status",
    )
    .eq("external_payment_id", sessionId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, error: "Order not found for this payment session." };
  }

  const { data: rows, error: itemsError } = await admin
    .from("order_items")
    .select(
      "product_external_id, variant_external_id, name, quantity, unit_price_cents, sku, metadata",
    )
    .eq("order_id", order.id);

  if (itemsError || !rows?.length) {
    return { ok: false, error: "Order items not found." };
  }

  const shipping = order.shipping_address as CheckoutShippingAddress;
  const currency = (order.currency || "USD").toUpperCase();

  const items: ValidatedCheckoutItem[] = rows.map((row) => {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    const syncVariantId = Number(meta.syncVariantId || row.variant_external_id);
    const retailPrice =
      typeof meta.retailPrice === "string"
        ? meta.retailPrice
        : ((row.unit_price_cents || 0) / 100).toFixed(2);

    return {
      productId: String(row.product_external_id || ""),
      variantId: String(row.variant_external_id || ""),
      syncVariantId,
      quantity: row.quantity,
      retailPrice,
      unitPrice: retailPrice,
      unitPriceCents: row.unit_price_cents || 0,
      currency,
      name: row.name || "Vitality Sweat item",
      sku: row.sku || undefined,
      size: typeof meta.size === "string" ? meta.size : undefined,
      color: typeof meta.color === "string" ? meta.color : undefined,
      image: typeof meta.image === "string" ? meta.image : undefined,
    };
  });

  return {
    ok: true,
    orderId: order.id,
    shipping,
    items,
    alreadyFulfilled: Boolean(order.external_fulfillment_id),
    printfulOrderId: order.external_fulfillment_id
      ? String(order.external_fulfillment_id)
      : null,
    currency,
  };
}

export async function fulfillPaidOrder(input: {
  orderExternalId: string;
  shipping: CheckoutShippingAddress;
  items: ValidatedCheckoutItem[];
}): Promise<{ ok: true; printfulOrderId: string } | { ok: false; error: string }> {
  const printfulItems: PrintfulOrderItemInput[] = input.items.map((item) => ({
    sync_variant_id: item.syncVariantId,
    quantity: item.quantity,
    retail_price: item.retailPrice,
    name: item.name,
  }));

  try {
    const result = await createPrintfulOrder({
      externalId: input.orderExternalId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32),
      recipient: {
        name: input.shipping.name,
        email: input.shipping.email,
        phone: input.shipping.phone,
        address1: input.shipping.address1,
        address2: input.shipping.address2,
        city: input.shipping.city,
        state_code: input.shipping.state,
        country_code: input.shipping.country || "US",
        zip: input.shipping.zip,
      },
      items: printfulItems,
      confirm: true,
    });

    return { ok: true, printfulOrderId: String(result.id) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Printful order failed.";
    return { ok: false, error: message };
  }
}
