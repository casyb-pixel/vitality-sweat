"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
import { trackSignupComplete } from "@/lib/analytics/ga";
import { sanitizeNextPath } from "@/lib/auth/safe-next";

type AuthIntent = "signin" | "signup";

/**
 * Watches `?auth=required|forbidden|signup` on any route and opens LoginModal.
 * Also completes growth tracking when `joined=1` is present after signup.
 */
function AuthQueryListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const authFlag = searchParams.get("auth");
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next"), "/app"),
    [searchParams],
  );

  const initialView =
    authFlag === "forbidden" ? ("denied" as const) : ("form" as const);

  const initialIntent: AuthIntent =
    authFlag === "signup" ? "signup" : "signin";

  useEffect(() => {
    if (
      authFlag === "required" ||
      authFlag === "forbidden" ||
      authFlag === "signup"
    ) {
      setOpen(true);
    }
  }, [authFlag]);

  useEffect(() => {
    if (searchParams.get("joined") !== "1") return;
    trackSignupComplete("magic_or_confirm");
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
