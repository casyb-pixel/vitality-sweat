"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";

const fieldClass =
  "w-full border border-brand-ink/15 bg-surface px-3 py-3 font-sans text-base text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-orange focus:outline-none";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setReady(Boolean(data.user));
      if (!data.user) {
        setError(
          "Open the password reset link from your email first, then return here.",
        );
      }
    });
  }, []);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) {
          setError(updateError.message);
          return;
        }
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update password.");
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
          {done ? "Password updated" : "Choose a new password"}
        </h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="font-sans text-sm leading-relaxed text-brand-muted">
              Your password is set. You can sign in with it any time.
            </p>
            <Link
              href="/app/creator"
              className="inline-flex min-h-12 w-full items-center justify-center bg-brand-ink px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange"
            >
              Open Creator Studio
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <p className="font-sans text-sm leading-relaxed text-brand-muted">
              Replace the temporary password with one only you know.
            </p>
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                disabled={!ready || isPending}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={fieldClass}
                disabled={!ready || isPending}
              />
            </div>
            {error ? (
              <p className="font-sans text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!ready || isPending}
              className="inline-flex min-h-12 w-full items-center justify-center bg-brand-ink px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
