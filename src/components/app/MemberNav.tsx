"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

const NAV_LINKS = [
  { href: "/app", label: "Home", exact: true },
  { href: "/app/workout", label: "Workout" },
  { href: "/app/engine-room", label: "Engine Room" },
  { href: "/app/history", label: "History" },
  { href: "/app/progress", label: "Progress" },
  { href: "/app/nutrition", label: "Fuel" },
  { href: "/app/library", label: "Library" },
  { href: "/app/settings", label: "Settings" },
] as const;

export default function MemberNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-surface-elevated/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 max-w-site items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/app" className="flex shrink-0 items-center gap-2">
          <Image
            src="/branding/logo-original-transparent.svg"
            alt="Vitality Sweat"
            width={132}
            height={38}
            className="h-8 w-auto"
            sizes="132px"
            priority
          />
          <span className="hidden font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange sm:inline">
            Engine
          </span>
        </Link>

        <nav
          aria-label="Member app"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(
              link.href,
              "exact" in link ? link.exact : false,
            );
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 font-sans text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-orange/10 text-brand-orange"
                    : "text-brand-muted hover:text-brand-orange"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="font-sans text-xs font-semibold text-brand-ink hover:text-brand-orange disabled:opacity-60 sm:text-sm"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <nav
        aria-label="Member app mobile"
        className="flex gap-1 overflow-x-auto border-t border-brand-ink/5 px-2 py-1.5 md:hidden"
      >
        {NAV_LINKS.map((link) => {
          const active = isActive(
            link.href,
            "exact" in link ? link.exact : false,
          );
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-2 font-sans text-xs font-semibold ${
                active
                  ? "bg-brand-orange/10 text-brand-orange"
                  : "text-brand-muted"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
