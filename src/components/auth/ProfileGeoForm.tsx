"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  isValidUsZip,
  normalizeUsZip,
  type MemberProfile,
} from "@/lib/auth/member-profile";

type ProfileGeoFormProps = {
  profile: Pick<
    MemberProfile,
    "display_name" | "city" | "zip_code" | "region"
  > | null;
  requireGeo?: boolean;
};

const fieldClass =
  "mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
const labelClass = "block font-sans text-sm font-semibold text-brand-ink";

export default function ProfileGeoForm({
  profile,
  requireGeo = false,
}: ProfileGeoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [zipCode, setZipCode] = useState(profile?.zip_code ?? "");
  const [region, setRegion] = useState(profile?.region ?? "");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        const trimmedCity = city.trim();
        if (!trimmedCity) {
          setError("City is required.");
          return;
        }
        const zip = normalizeUsZip(zipCode);
        if (!isValidUsZip(zip)) {
          setError("Enter a valid US ZIP code (12345 or 12345-6789).");
          return;
        }

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: displayName.trim() || null,
            city: trimmedCity,
            zip_code: zip,
            region: region.trim() || null,
          }),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Could not save your location.");
          return;
        }

        setSaved(true);
        router.refresh();
        if (requireGeo) {
          router.replace("/app");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4 border border-brand-ink/10 bg-surface-elevated p-5">
      <div>
        <h2 className="font-display text-xl text-brand-ink">
          {requireGeo ? "Add your location" : "Your location"}
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
          {requireGeo
            ? "We need your city and ZIP before you can use the full Vitality Engine app."
            : "Update the city and ZIP we use for local community offers."}
        </p>
      </div>

      <div>
        <label htmlFor="profile-display-name" className={labelClass}>
          Display name (optional)
        </label>
        <input
          id="profile-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={fieldClass}
          autoComplete="nickname"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-city" className={labelClass}>
            City
          </label>
          <input
            id="profile-city"
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={fieldClass}
            autoComplete="address-level2"
            placeholder="e.g. Lafayette"
          />
        </div>
        <div>
          <label htmlFor="profile-zip" className={labelClass}>
            ZIP code
          </label>
          <input
            id="profile-zip"
            type="text"
            required
            inputMode="numeric"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className={fieldClass}
            autoComplete="postal-code"
            placeholder="70501"
            pattern="\d{5}(-\d{4})?"
          />
        </div>
      </div>

      <div>
        <label htmlFor="profile-region" className={labelClass}>
          Parish / region (optional)
        </label>
        <input
          id="profile-region"
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={fieldClass}
          autoComplete="address-level1"
          placeholder="e.g. Lafayette Parish"
        />
      </div>

      {error ? (
        <p role="alert" className="font-sans text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {saved && !requireGeo ? (
        <p className="font-sans text-sm font-semibold text-brand-ink" role="status">
          Location saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : requireGeo ? "Save & continue" : "Save location"}
      </button>
    </form>
  );
}
