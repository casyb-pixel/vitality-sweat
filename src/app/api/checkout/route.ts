import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo/site";
import type { CheckoutShippingAddress } from "@/lib/store/cart";
import {
  attachStripeSessionToOrder,
  persistOrder,
  validateCheckoutItems,
  type CheckoutCartItem,
} from "@/lib/store/checkout-server";
import { getStripe, isStripeConfigured } from "@/lib/store/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutRequestBody = {
  items: CheckoutCartItem[];
  shipping: CheckoutShippingAddress;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateShipping(
  shipping: unknown,
): { ok: true; data: CheckoutShippingAddress } | { ok: false; error: string } {
  if (!shipping || typeof shipping !== "object") {
    return { ok: false, error: "Shipping address is required." };
  }
  const s = shipping as Record<string, unknown>;
  const required = [
    "name",
    "email",
    "address1",
    "city",
    "state",
    "country",
    "zip",
  ] as const;
  for (const key of required) {
    if (!isNonEmptyString(s[key])) {
      return { ok: false, error: `Missing shipping field: ${key}.` };
    }
  }
  if (!String(s.email).includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }
  return {
    ok: true,
    data: {
      name: String(s.name).trim(),
      email: String(s.email).trim(),
      phone: isNonEmptyString(s.phone) ? String(s.phone).trim() : undefined,
      address1: String(s.address1).trim(),
      address2: isNonEmptyString(s.address2)
        ? String(s.address2).trim()
        : undefined,
      city: String(s.city).trim(),
      state: String(s.state).trim(),
      country: String(s.country).trim().toUpperCase(),
      zip: String(s.zip).trim(),
    },
  };
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Payments are not configured yet. Add STRIPE_SECRET_KEY to enable checkout.",
        error: "stripe_not_configured",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: "invalid", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const body = json as CheckoutRequestBody;
  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { ok: false, status: "invalid", message: "items array is required." },
      { status: 400 },
    );
  }

  const shippingParsed = validateShipping(body.shipping);
  if (!shippingParsed.ok) {
    return NextResponse.json(
      { ok: false, status: "invalid", message: shippingParsed.error },
      { status: 400 },
    );
  }

  const validated = await validateCheckoutItems(body.items);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, status: "invalid", message: validated.error },
      { status: 400 },
    );
  }

  const orderId = await persistOrder({
    status: "awaiting_payment",
    paymentStatus: "pending",
    fulfillmentStatus: "unsubmitted",
    currency: validated.currency,
    email: shippingParsed.data.email,
    shipping: shippingParsed.data,
    subtotalCents: validated.subtotalCents,
    totalCents: validated.subtotalCents,
    paymentProvider: "stripe",
    fulfillmentProvider: "printful",
    metadata: {
      itemCount: validated.items.reduce((n, i) => n + i.quantity, 0),
    },
    items: validated.items,
  });

  if (!orderId) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Could not create order record. Confirm SUPABASE_SERVICE_ROLE_KEY is set.",
        error: "order_persist_failed",
      },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  const origin = (() => {
    try {
      return new URL(request.headers.get("origin") || SITE_URL).origin;
    } catch {
      return SITE_URL;
    }
  })();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: shippingParsed.data.email,
    success_url: `${origin}/store/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/store/checkout?cancelled=1`,
    line_items: validated.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: item.unitPriceCents,
        product_data: {
          name: item.name,
          description:
            [item.color, item.size].filter(Boolean).join(" · ") || undefined,
          images: item.image?.startsWith("http") ? [item.image] : undefined,
        },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 0,
            currency: validated.currency.toLowerCase(),
          },
          display_name: "Standard shipping (via Printful)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 12 },
          },
        },
      },
    ],
    metadata: {
      vs_order_id: orderId,
    },
  });

  if (!session.url) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Stripe did not return a checkout URL.",
      },
      { status: 502 },
    );
  }

  await attachStripeSessionToOrder(orderId, session.id);

  return NextResponse.json({
    ok: true,
    status: "checkout_ready",
    orderId,
    checkoutUrl: session.url,
    sessionId: session.id,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/checkout",
    methods: ["POST"],
    stripeConfigured: isStripeConfigured(),
    message: isStripeConfigured()
      ? "POST shipping + cart items to create a Stripe Checkout session."
      : "Configure STRIPE_SECRET_KEY to enable live checkout.",
  });
}
