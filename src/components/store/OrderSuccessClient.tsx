"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/store/CartProvider";

type CompleteState =
  | { status: "loading" }
  | { status: "ok"; message: string; printfulOrderId?: string | null }
  | { status: "error"; message: string };

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const [state, setState] = useState<CompleteState>({ status: "loading" });

  useEffect(() => {
    if (!sessionId) {
      setState({
        status: "error",
        message: "Missing payment session. If you were charged, contact support with your receipt.",
      });
      return;
    }

    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(
          `/api/checkout/complete?session_id=${encodeURIComponent(sessionId!)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          printfulOrderId?: string | null;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({
            status: "error",
            message:
              data.message ||
              "Payment may have succeeded, but fulfillment needs a moment. We will retry automatically.",
          });
          return;
        }
        clearCart();
        setState({
          status: "ok",
          message: data.message || "Order confirmed.",
          printfulOrderId: data.printfulOrderId,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Could not confirm fulfillment yet. Refresh this page in a minute.",
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, clearCart]);

  return (
    <div className="site-shell section-y">
      <p className="eyebrow text-brand-orange">Order status</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] text-brand-ink">
        {state.status === "ok" ? "Thank you" : "Finishing your order"}
      </h1>

      {state.status === "loading" ? (
        <p className="mt-4 font-sans text-brand-muted">
          Confirming payment and sending your order to Printful…
        </p>
      ) : null}

      {state.status === "ok" ? (
        <div className="mt-4 max-w-xl space-y-3 font-sans text-brand-muted">
          <p>{state.message}</p>
          {state.printfulOrderId ? (
            <p className="text-sm">
              Fulfillment reference:{" "}
              <span className="font-semibold text-brand-ink">
                {state.printfulOrderId}
              </span>
            </p>
          ) : null}
          <p className="text-sm">
            You will receive shipping updates from Printful by email.
          </p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-4 max-w-xl border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/store"
          className="inline-flex bg-brand-orange px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
        >
          Back to store
        </Link>
        <Link
          href="/"
          className="inline-flex border border-brand-ink/15 px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink hover:border-brand-orange"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
