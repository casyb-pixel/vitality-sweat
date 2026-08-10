"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import {
  getMemberCompletionRedirect,
  isValidUsZip,
  normalizeUsZip,
} from "@/lib/auth/member-profile";
import { buildAuthCallbackUrl } from "@/lib/auth/redirect";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import { sanitizeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/utils/supabase/client";

type AuthMode = "password" | "magic";
type AuthIntent = "signin" | "signup";
type PortalView = "form" | "denied" | "magic-sent" | "reset-sent" | "confirm-sent";

type LoginModalProps = {
  open: boolean;
  nextPath: string;
  initialView?: PortalView;
  onClose: () => void;
};

const fieldClass =
  "w-full border border-brand-ink/15 bg-surface px-3 py-3 font-sans text-base text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-orange focus:outline-none";

export default function LoginModal({
  open,
  nextPath,
  initialView = "form",
  onClose,
}: LoginModalProps) {
  const router = useRouter();
  const titleId = useId();
  const [mode, setMode] = useState<AuthMode>("password");
  const [intent, setIntent] = useState<AuthIntent>("signin");
  const [view, setView] = useState<PortalView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setView(initialView);
      setError(null);
    }
  }, [open, initialView]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const safeNext = sanitizeNextPath(nextPath, "/app");
  const wantsCreatorStudio =
    safeNext === "/app/creator" || safeNext.startsWith("/app/creator/");
  const isSignup = intent === "signup";

  function geoMetadata() {
    return {
      city: city.trim(),
      zip_code: normalizeUsZip(zipCode),
      region: region.trim() || undefined,
    };
  }

  function validateSignupGeo(): string | null {
    if (!city.trim()) return "Enter your city.";
    if (!isValidUsZip(zipCode)) {
      return "Enter a valid US ZIP code (12345 or 12345-6789).";
    }
    return null;
  }

  async function afterAuthenticated() {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(userError?.message ?? "Could not verify your session.");
      return;
    }

    const access = await resolveAccessDecision(supabase, user);

    if (access.status === "creator") {
      onClose();
      router.replace(
        safeNext.startsWith("/app/") ? safeNext : "/app/creator",
      );
      router.refresh();
      return;
    }

    // Members may use the Vitality Engine app; only Creator Studio is gated.
    if (wantsCreatorStudio) {
      setView("denied");
      return;
    }

    const completion = await getMemberCompletionRedirect(supabase, user.id);
    onClose();
    const destination =
      completion ??
      (safeNext.startsWith("/app") || safeNext.startsWith("/profile")
        ? safeNext
        : "/app");
    router.replace(destination);
    router.refresh();
  }

  function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createClient();

        if (isSignup) {
          const geoError = validateSignupGeo();
          if (geoError) {
            setError(geoError);
            return;
          }
          if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
          }

          const redirectTo = buildAuthCallbackUrl(safeNext);
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: redirectTo,
              data: geoMetadata(),
            },
          });
          if (signUpError) {
            setError(signUpError.message);
            return;
          }

          if (data.session) {
            // Persist geo in case the trigger missed metadata.
            await supabase
              .from("profiles")
              .update({
                city: city.trim(),
                zip_code: normalizeUsZip(zipCode),
                region: region.trim() || null,
              })
              .eq("id", data.session.user.id);
            await afterAuthenticated();
            return;
          }

          setView("confirm-sent");
          return;
        }

        const { error: signError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signError) {
          setError(signError.message);
          return;
        }
        await afterAuthenticated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed.");
      }
    });
  }

  function submitMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (isSignup) {
          const geoError = validateSignupGeo();
          if (geoError) {
            setError(geoError);
            return;
          }
        }

        const supabase = createClient();
        const redirectTo = buildAuthCallbackUrl(safeNext);
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: true,
            data: isSignup ? geoMetadata() : undefined,
          },
        });
        if (otpError) {
          setError(otpError.message);
          return;
        }
        setView("magic-sent");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Magic link failed.");
      }
    });
  }

  function sendPasswordReset() {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email first, then request a reset link.");
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
        setView("reset-sent");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not send reset email.",
        );
      }
    });
  }

  function goToProfile() {
    onClose();
    router.push("/profile");
  }

  const formTitle = isSignup ? "Create free account" : "Sign in to continue";
  const formEyebrow = view === "denied" ? "Creator access" : "Vitality Engine";

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-brand-ink/55 backdrop-blur-[2px]"
        aria-label="Close sign-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto border-t border-brand-ink/10 bg-surface-elevated shadow-[0_-16px_48px_rgba(64,64,64,0.2)] sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[90vh] sm:w-[min(28rem,calc(100%-2rem))] sm:border sm:shadow-[0_24px_60px_rgba(64,64,64,0.22)]"
      >
        <div className="border-b border-brand-ink/10 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Image
                src="/branding/logo-original-transparent.svg"
                alt="Vitality Sweat"
                width={160}
                height={40}
                className="h-9 w-auto"
              />
              <p className="eyebrow mt-4 text-brand-orange">{formEyebrow}</p>
              <h2
                id={titleId}
                className="mt-2 font-display text-2xl text-brand-ink sm:text-[1.75rem]"
              >
                {view === "denied"
                  ? "Studio access denied"
                  : view === "magic-sent" ||
                      view === "reset-sent" ||
                      view === "confirm-sent"
                    ? "Check your email"
                    : formTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-brand-ink/15 font-sans text-lg text-brand-ink hover:border-brand-orange hover:text-brand-orange"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {view === "denied" ? (
            <div className="space-y-4">
              <p className="font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
                You’re signed in, but this account doesn’t have Creator Studio
                privileges yet. You can still use the Vitality Engine member
                app — ask Hunter if you need coach access.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    startTransition(async () => {
                      const supabase = createClient();
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) {
                        router.replace("/app");
                        return;
                      }
                      const completion = await getMemberCompletionRedirect(
                        supabase,
                        user.id,
                      );
                      router.replace(completion ?? "/app");
                      router.refresh();
                    });
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center bg-brand-orange px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
                >
                  Open the app
                </button>
                <button
                  type="button"
                  onClick={goToProfile}
                  className="inline-flex min-h-11 flex-1 items-center justify-center border border-brand-ink/15 px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
                >
                  Go to profile
                </button>
              </div>
            </div>
          ) : view === "magic-sent" ||
            view === "reset-sent" ||
            view === "confirm-sent" ? (
            <div className="space-y-4">
              <p className="font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
                {view === "reset-sent" ? (
                  <>
                    We sent a password reset link to{" "}
                    <span className="font-semibold text-brand-ink">{email}</span>.
                    Open it to choose your own password, then sign in.
                  </>
                ) : view === "confirm-sent" ? (
                  <>
                    We sent a confirmation link to{" "}
                    <span className="font-semibold text-brand-ink">{email}</span>.
                    Open it on this device to finish creating your free account.
                  </>
                ) : (
                  <>
                    We sent a magic link to{" "}
                    <span className="font-semibold text-brand-ink">{email}</span>.
                    Open it on this device to finish{" "}
                    {isSignup ? "creating your account" : "signing in"}.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setView("form")}
                className="font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange"
              >
                Use a different method
              </button>
            </div>
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Account action"
                className="flex gap-1 border border-brand-ink/10 bg-surface p-1"
              >
                {(
                  [
                    { id: "signin", label: "Sign in" },
                    { id: "signup", label: "Create free account" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={intent === tab.id}
                    onClick={() => {
                      setIntent(tab.id);
                      setError(null);
                    }}
                    className={`min-h-10 flex-1 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                      intent === tab.id
                        ? "bg-brand-ink text-white"
                        : "text-brand-ink hover:text-brand-orange"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 font-sans text-sm leading-relaxed text-brand-muted">
                {isSignup
                  ? "Create a free Vitality Engine account with email and password, or a one-tap magic link. City and ZIP are required."
                  : "Sign in to your Vitality Engine account with email and password, or request a one-tap magic link."}
              </p>

              <div
                role="tablist"
                aria-label="Sign-in method"
                className="mt-5 flex gap-1 border border-brand-ink/10 bg-surface p-1"
              >
                {(
                  [
                    { id: "password", label: "Password" },
                    { id: "magic", label: "Magic link" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab.id}
                    onClick={() => setMode(tab.id)}
                    className={`min-h-10 flex-1 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                      mode === tab.id
                        ? "bg-brand-orange text-white"
                        : "text-brand-ink hover:text-brand-orange"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form
                className="mt-5 space-y-4"
                onSubmit={mode === "password" ? submitPassword : submitMagicLink}
              >
                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
                  >
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                    placeholder="you@vitalitysweat.com"
                  />
                </div>

                {mode === "password" ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="auth-password"
                        className="block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
                      >
                        Password
                      </label>
                      {!isSignup ? (
                        <button
                          type="button"
                          onClick={sendPasswordReset}
                          disabled={isPending}
                          className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange hover:text-brand-orange-deep disabled:opacity-60"
                        >
                          Forgot password?
                        </button>
                      ) : null}
                    </div>
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete={
                        isSignup ? "new-password" : "current-password"
                      }
                      required
                      minLength={isSignup ? 8 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={fieldClass}
                      placeholder="••••••••"
                    />
                  </div>
                ) : null}

                {isSignup ? (
                  <div className="space-y-4 border border-brand-ink/10 bg-surface p-3">
                    <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
                      Your location
                    </p>
                    <div>
                      <label
                        htmlFor="auth-city"
                        className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
                      >
                        City
                      </label>
                      <input
                        id="auth-city"
                        type="text"
                        required
                        autoComplete="address-level2"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className={fieldClass}
                        placeholder="e.g. Lafayette"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="auth-zip"
                        className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
                      >
                        ZIP code
                      </label>
                      <input
                        id="auth-zip"
                        type="text"
                        required
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className={fieldClass}
                        placeholder="70501"
                        pattern="\d{5}(-\d{4})?"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="auth-region"
                        className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted"
                      >
                        Parish / region (optional)
                      </label>
                      <input
                        id="auth-region"
                        type="text"
                        autoComplete="address-level1"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className={fieldClass}
                        placeholder="e.g. Lafayette Parish"
                      />
                    </div>
                  </div>
                ) : null}

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
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-brand-ink px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-orange disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        aria-hidden
                      />
                      {mode === "password"
                        ? isSignup
                          ? "Creating account…"
                          : "Signing in…"
                        : "Sending link…"}
                    </>
                  ) : mode === "password" ? (
                    isSignup ? (
                      "Create free account"
                    ) : (
                      "Sign in"
                    )
                  ) : isSignup ? (
                    "Email magic link to join"
                  ) : (
                    "Email magic link"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
