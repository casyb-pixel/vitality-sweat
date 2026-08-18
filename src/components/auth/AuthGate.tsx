"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
import { trackSignupComplete } from "@/lib/analytics/ga";
import { sanitizeNextPath } from "@/lib/auth/safe-next";
import {
  clearRememberedCampaignAttribution,
  parseCampaignAttribution,
  rememberCampaignAttribution,
} from "@/lib/marketing/campaign-attribution";
import {
  normalizeReferralCode,
  rememberReferralCode,
  clearRememberedReferralCode,
} from "@/lib/referrals/codes";

type AuthIntent = "signin" | "signup";

/**
 * Watches `?auth=required|forbidden|signup|reset`, referral `ref`, and campaign params.
 * Also completes growth tracking when `joined=1` is present after signup.
 * `?auth=reset` is a shareable forgot-password deep link.
 */
function AuthQueryListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const authFlag = searchParams.get("auth");
  const refCode = useMemo(
    () => normalizeReferralCode(searchParams.get("ref")),
    [searchParams],
  );
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next"), "/app"),
    [searchParams],
  );

  const initialView =
    authFlag === "forbidden" ? ("denied" as const) : ("form" as const);

  const initialIntent: AuthIntent =
    authFlag === "signup" || Boolean(refCode) ? "signup" : "signin";

  useEffect(() => {
    if (refCode) {
      rememberReferralCode(refCode);
    }
    const campaign = parseCampaignAttribution(searchParams);
    if (campaign) rememberCampaignAttribution(campaign);
  }, [refCode, searchParams]);

  useEffect(() => {
    if (authFlag === "reset" || authFlag === "forgot") {
      const email = searchParams.get("email")?.trim();
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      router.replace(`/auth/forgot-password${qs}`);
      return;
    }
    if (
      authFlag === "required" ||
      authFlag === "forbidden" ||
      authFlag === "signup" ||
      Boolean(refCode)
    ) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }, [authFlag, refCode, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("joined") !== "1") return;
    trackSignupComplete("magic_or_confirm");
    void fetch("/api/app/emails/welcome", { method: "POST" }).catch(() => {
      // Non-blocking — outbox / Resend handled server-side.
    });
    clearRememberedReferralCode();
    clearRememberedCampaignAttribution();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("joined");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  const clearAuthQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("next");
    params.delete("error");
    params.delete("ref");
    params.delete("src");
    params.delete("gym");
    params.delete("utm_source");
    params.delete("utm_medium");
    params.delete("utm_campaign");
    params.delete("utm_content");
    params.delete("market");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleClose = useCallback(() => {
    setOpen(false);
    clearAuthQuery();
  }, [clearAuthQuery]);

  return (
    <LoginModal
      open={open}
      nextPath={nextPath}
      initialView={initialView}
      initialIntent={initialIntent}
      initialReferralCode={refCode}
      onClose={handleClose}
    />
  );
}

export default function AuthGate() {
  return (
    <Suspense fallback={null}>
      <AuthQueryListener />
    </Suspense>
  );
}
