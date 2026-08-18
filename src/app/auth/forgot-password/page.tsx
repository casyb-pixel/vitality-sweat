"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { buildAuthCallbackUrl } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/client";

const fieldClass =
  "w-full border border-brand-ink/15 bg-surface px-3 py-3 font-sans text-base text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-orange focus:outline-none";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const presetEmail = useMemo(
    () => (searchParams.get("email") ?? "").trim(),
    [searchParams],
  );
  const [email, setEmail] = useState(presetEmail);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email on your account.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const redirectTo = buildAuthCallbackUrl("/auth/update-password");
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmed,
          { redirectTo },
        );
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setSent(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not send reset email.",
        );
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-md border border-brand-ink/10 bg-surface-elevated p-6 sm:p-8">
        <Image
          src="/branding/logo-original-transparent.svg"
          alt="Vitality Sweat"
          width={160}
          height={40}
          className="h-9 w-auto"
        />
        <p className="eyebrow mt-6 text-brand-orange">Account security</p>
        <h1 className="mt-2 font-display text-3xl text-brand-ink">
          {sent ? "Check your email" : "Reset your password"}
        </h1>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="font-sans text-sm leading-relaxed text-brand-muted">
              If an account exists for{" "}
              <span className="font-semibold text-brand-ink">{email.trim()}</span>
              , we sent a reset link. Open it on this device, then choose a new
              password. Check spam if it is not in your inbox within a few
              minutes.
            </p>
            <Link
              href="/?auth=required"
              className="inline-flex min-h-12 w-full items-center justify-center bg-brand-ink px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <p className="font-sans text-sm leading-relaxed text-brand-muted">
              Enter the email on your Vitality Engine account. We will send a
              link to choose a new password.
            </p>
            <div>
              <label
                htmlFor="reset-email"
                className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                placeholder="you@vitalitysweat.com"
              />
            </div>
            {error ? (
              <p
                className="font-sans text-sm font-semibold text-red-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-12 w-full items-center justify-center bg-brand-ink px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange disabled:opacity-60"
            >
              {isPending ? "Sending link…" : "Email reset link"}
            </button>
            <Link
              href="/?auth=required"
              className="block text-center font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
          <p className="font-sans text-sm text-brand-muted">Loading…</p>
        </main>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
