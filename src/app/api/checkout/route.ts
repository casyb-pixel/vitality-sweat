import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mock checkout pipeline — validates cart payloads and returns a staged order
 * envelope for a future Printful/Printify fulfillment + payment provider hookup.
 *
 * Intended flow (not yet live):
 * 1. Validate line items against `/api/products/feed`
 * 2. Create a payment intent (Stripe / PayPal / etc.)
 * 3. On payment success, submit an order to Printful Orders API (or Printify)
 * 4. Persist order + fulfillment IDs in Supabase
 */

export type CheckoutLineItem = {
  productId: string;
  variantId?: string;
  sku?: string;
  quantity: number;
  unitPrice?: string;
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

export type CheckoutRequestBody = {
  items: CheckoutLineItem[];
  shipping?: CheckoutShippingAddress;
  /** Future: stripe | paypal | square */
  paymentProvider?: "stripe" | "paypal" | "mock";
  /** Future: printful | printify */
  fulfillmentProvider?: "printful" | "printify" | "mock";
  currency?: string;
};

export type CheckoutResponse = {
  ok: boolean;
  status: "mocked" | "invalid" | "error";
  orderId?: string;
  message: string;
  pipeline?: {
    payment: {
      provider: string;
      status: "awaiting_handler";
      clientSecretPlaceholder: null;
    };
    fulfillment: {
      provider: string;
      status: "queued_for_api";
      externalOrderId: null;
    };
  };
  echo?: {
    itemCount: number;
    currency: string;
    hasShipping: boolean;
  };
  error?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateBody(body: unknown): {
  ok: true;
  data: CheckoutRequestBody;
} | {
  ok: false;
  error: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const candidate = body as CheckoutRequestBody;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) {
    return { ok: false, error: "At least one line item is required." };
  }

  for (const [index, item] of candidate.items.entries()) {
    if (!isNonEmptyString(item.productId)) {
      return {
        ok: false,
        error: `items[${index}].productId is required.`,
      };
    }
    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity < 1
    ) {
      return {
        ok: false,
        error: `items[${index}].quantity must be a positive number.`,
      };
    }
  }

  if (candidate.shipping) {
    const required: Array<keyof CheckoutShippingAddress> = [
      "name",
      "email",
      "address1",
      "city",
      "state",
      "country",
      "zip",
    ];
    for (const key of required) {
      if (!isNonEmptyString(candidate.shipping[key])) {
        return {
          ok: false,
          error: `shipping.${key} is required when shipping is provided.`,
        };
      }
    }
  }

  return { ok: true, data: candidate };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid",
        message: "Invalid JSON body.",
        error: "Invalid JSON body.",
      } satisfies CheckoutResponse,
      { status: 400 },
    );
  }

  const parsed = validateBody(json);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid",
        message: parsed.error,
        error: parsed.error,
      } satisfies CheckoutResponse,
      { status: 400 },
    );
  }

  const {
    items,
    shipping,
    paymentProvider = "mock",
    fulfillmentProvider = "printful",
    currency = "USD",
  } = parsed.data;

  const orderId = `vs_mock_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  // Stub only — no payment capture or Printful order submission yet.
  const response: CheckoutResponse = {
    ok: true,
    status: "mocked",
    orderId,
    message:
      "Checkout accepted in mock mode. Wire payment handlers and Printful/Printify fulfillment next.",
    pipeline: {
      payment: {
        provider: paymentProvider,
        status: "awaiting_handler",
        clientSecretPlaceholder: null,
      },
      fulfillment: {
        provider: fulfillmentProvider,
        status: "queued_for_api",
        externalOrderId: null,
      },
    },
    echo: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      currency,
      hasShipping: Boolean(shipping),
    },
  };

  return NextResponse.json(response, { status: 200 });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: "/api/checkout",
      methods: ["POST"],
      status: "mocked",
      message:
        "POST a cart payload to stage a mock order. Payment and fulfillment providers are not live.",
      expectedBody: {
        items: [
          {
            productId: "string",
            variantId: "string (optional)",
            sku: "string (optional)",
            quantity: 1,
          },
        ],
        shipping: {
          name: "string",
          email: "string",
          address1: "string",
          city: "string",
          state: "string",
          country: "US",
          zip: "string",
        },
        paymentProvider: "mock | stripe | paypal",
        fulfillmentProvider: "printful | printify | mock",
      },
    },
    { status: 200 },
  );
}
