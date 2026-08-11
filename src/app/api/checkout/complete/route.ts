import { NextResponse } from "next/server";
import {
  fulfillPaidOrder,
  loadOrderForFulfillment,
  updateOrderByPaymentId,
} from "@/lib/store/checkout-server";
import { getStripe, isStripeConfigured } from "@/lib/store/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fulfillFromSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return {
      ok: false as const,
      status: "unpaid",
      message: "Payment is not complete yet.",
    };
  }

  const loaded = await loadOrderForFulfillment(sessionId);
  if (!loaded.ok) {
    return {
      ok: false as const,
      status: "order_missing",
      message: loaded.error,
    };
  }

  if (loaded.alreadyFulfilled) {
    return {
      ok: true as const,
      status: "already_fulfilled",
      orderId: loaded.orderId,
      printfulOrderId: loaded.printfulOrderId,
      message: "Order already sent to Printful.",
    };
  }

  const fulfillment = await fulfillPaidOrder({
    orderExternalId: session.id,
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
    return {
      ok: false as const,
      status: "fulfillment_failed",
      message: fulfillment.error,
    };
  }

  await updateOrderByPaymentId(sessionId, {
    status: "fulfillment_queued",
    payment_status: "paid",
    fulfillment_status: "submitted",
    external_fulfillment_id: fulfillment.printfulOrderId,
  });

  return {
    ok: true as const,
    status: "fulfilled",
    orderId: loaded.orderId,
    printfulOrderId: fulfillment.printfulOrderId,
    message: "Payment confirmed and Printful order created.",
  };
}

export async function GET(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, message: "session_id is required." },
      { status: 400 },
    );
  }

  try {
    const result = await fulfillFromSession(sessionId);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete order.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
