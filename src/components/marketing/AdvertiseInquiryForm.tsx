"use client";

import { useState } from "react";
import { RATE_CARD_PACKAGES } from "@/lib/markets/audience-brief";
import { METROS } from "@/lib/markets/metros";

export default function AdvertiseInquiryForm() {
  const [pending, setPending] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/advertise/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          business: form.get("business"),
          package_id: form.get("package_id"),
          market: form.get("market"),
          message: form.get("message"),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not send. Email hello@vitalitysweat.com.");
        return;
      }
      setOk(true);
    } catch {
      setError("Could not send. Email hello@vitalitysweat.com.");
    } finally {
      setPending(false);
    }
  }

  if (ok) {
    return (
      <p className="font-sans text-sm text-brand-ink">
        Got it. Hunter or a parent coach will follow up with an invoice or a
        call. Consumer Engine stays free.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-3">
      <h2 className="font-display text-2xl text-brand-ink">Book a flight</h2>
      <p className="font-sans text-sm text-brand-muted">
        Request an invoice. No AdSense. Gyms, grocery, PT, baseball academies,
        smoothie bars welcome.
      </p>
      <input name="name" required placeholder="Your name" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <input name="email" type="email" required placeholder="Email" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <input name="business" placeholder="Business" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      <select name="package_id" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm">
        {RATE_CARD_PACKAGES.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name}
          </option>
        ))}
      </select>
      <select name="market" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm">
        {METROS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.shortLabel}
          </option>
        ))}
      </select>
      <textarea name="message" rows={4} placeholder="What should we know?" className="w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm" />
      {error ? <p className="font-sans text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-brand-orange px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request invoice"}
      </button>
    </form>
  );
}
