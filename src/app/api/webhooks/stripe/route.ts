import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  fulfillPaidOrder,
  loadOrderForFulfillment,
  updateOrderByPaymentId,
} from "@/lib/store/checkout-server";
import { getStripe, getStripeSecretKey } from "@/lib/store/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripeKey = getStripeSecretKey();
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json(
      { ok: false, message: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, message: "Missing signature." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await handlePaidSession(session.id);
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePaidSession(sessionId: string) {
  const loaded = await loadOrderForFulfillment(sessionId);
  if (!loaded.ok || loaded.alreadyFulfilled) return;

  const fulfillment = await fulfillPaidOrder({
    orderExternalId: sessionId,
    shipping: loaded.shipping,
    items: loaded.items,
  });

  if (!fulfillment.ok) {
    await updateOrderByPaymentId(sessionId, {
      status: "failed",
      payment_status: "paid",
      fulfillment_status: "failed",
      metadata: { printful_error: fulfillment.error },
    });
    return;
  }

  await updateOrderByPaymentId(sessionId, {
    status: "fulfillment_queued",
    payment_status: "paid",
    fulfillment_status: "submitted",
    external_fulfillment_id: fulfillment.printfulOrderId,
  });
}
