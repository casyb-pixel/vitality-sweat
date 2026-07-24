"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
import { sanitizeNextPath } from "@/lib/auth/safe-next";

/**
 * Watches `?auth=required|forbidden` on public routes and opens LoginModal.
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

  useEffect(() => {
    if (authFlag === "required" || authFlag === "forbidden") {
      setOpen(true);
    }
  }, [authFlag]);

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
