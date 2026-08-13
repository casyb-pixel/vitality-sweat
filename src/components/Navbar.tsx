"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import CartButton from "@/components/store/CartButton";
import { SOCIAL_LINKS } from "@/lib/seo/site";
import { createClient } from "@/utils/supabase/client";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/chronicles", label: "Chronicles", title: "The Sweatlife Chronicles" },
  { href: "/tools", label: "Tools" },
  { href: "/store", label: "Store" },
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const primaryCta =
    signedIn === true ? (
      <Link
        href="/app"
        className="animate-cta-pulse inline-flex items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white transition-[background-color,transform] hover:bg-brand-orange-deep active:scale-[0.98]"
      >
        Launch App
      </Link>
    ) : (
      <SignupCtaLink
        location="navbar_desktop"
        label="Create free account"
        className="animate-cta-pulse inline-flex items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white transition-[background-color,transform] hover:bg-brand-orange-deep active:scale-[0.98]"
      >
        Create free account
      </SignupCtaLink>
    );

  const mobileCta =
    signedIn === true ? (
      <Link
        href="/app"
        onClick={() => setOpen(false)}
        className="mt-6 inline-flex items-center justify-center bg-brand-orange px-6 py-4 font-sans text-base font-bold uppercase tracking-[0.1em] text-white"
      >
        Launch App
      </Link>
    ) : (
      <SignupCtaLink
        location="navbar_mobile"
        label="Create free account"
        onNavigate={() => setOpen(false)}
        className="mt-6 inline-flex items-center justify-center bg-brand-orange px-6 py-4 font-sans text-base font-bold uppercase tracking-[0.1em] text-white"
      >
        Create free account
      </SignupCtaLink>
    );

  const mobileMenu =
    mounted &&
    createPortal(
      <div
        id="mobile-nav"
        className={`fixed inset-0 z-[100] bg-surface-elevated transition-[opacity,visibility] duration-300 md:hidden ${
          open
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="site-shell flex h-[var(--header-h)] items-center justify-between gap-4 border-b border-brand-ink/10">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange"
            onClick={() => setOpen(false)}
            aria-label="Vitality Sweat home"
          >
            <Image
              src="/branding/logo-original-transparent.svg"
              alt=""
              width={220}
              height={54}
              sizes="(max-width: 640px) 180px, 220px"
              className="h-12 w-auto sm:h-14"
            />
            <span className="sr-only">Vitality Sweat</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-brand-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <span className="sr-only">Close</span>
            <span className="flex w-6 flex-col gap-1.5">
              <span className="block h-0.5 w-full translate-y-2 rotate-45 bg-current" />
              <span className="block h-0.5 w-full opacity-0 bg-current" />
              <span className="block h-0.5 w-full -translate-y-2 -rotate-45 bg-current" />
            </span>
          </button>
        </div>
        <nav
          aria-label="Mobile"
          className="site-shell flex h-[calc(100dvh-var(--header-h))] flex-col gap-2 overflow-y-auto pb-10 pt-6"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-brand-ink/10 py-4 font-display text-2xl text-brand-ink"
            >
              {"title" in link ? link.title : link.label}
            </Link>
          ))}
          <div className="mt-4 space-y-1 border-b border-brand-ink/10 pb-4">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
              Follow
            </p>
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block py-2.5 font-sans text-lg font-semibold text-brand-ink"
              >
                {link.label}
                {"handle" in link && link.handle ? (
                  <span className="ml-2 text-base font-medium text-brand-muted">
                    {link.handle}
                  </span>
                ) : null}
              </a>
            ))}
            <div className="py-2.5">
              <CartButton
                className="text-lg"
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
          {mobileCta}
        </nav>
      </div>,
      document.body,
    );

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled || open
            ? "border-brand-ink/10 bg-surface-elevated/95 shadow-[0_8px_30px_rgba(64,64,64,0.08)] backdrop-blur-md"
            : "border-transparent bg-surface-elevated/80 backdrop-blur-sm"
        }`}
      >
        <div className="site-shell flex h-[var(--header-h)] items-center justify-between gap-4">
          <Link
            href="/"
            className="relative z-50 flex shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange"
            onClick={() => setOpen(false)}
            aria-label="Vitality Sweat home"
          >
            <Image
              src="/branding/logo-original-transparent.svg"
              alt=""
              width={220}
              height={54}
              priority
              sizes="(max-width: 640px) 180px, 220px"
              className="h-12 w-auto sm:h-14"
            />
            <span className="sr-only">Vitality Sweat</span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={"title" in link ? link.title : undefined}
                className="whitespace-nowrap font-sans text-[0.95rem] font-semibold tracking-wide text-brand-ink transition-colors hover:text-brand-orange"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 border-l border-brand-ink/10 pl-4">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-muted transition-colors hover:text-brand-orange"
                >
                  {link.label}
                </a>
              ))}
              <CartButton />
            </div>
            {primaryCta}
          </nav>

          <button
            type="button"
            className="relative z-50 inline-flex h-11 w-11 items-center justify-center text-brand-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex w-6 flex-col gap-1.5">
              <span
                className={`block h-0.5 w-full bg-current transition-transform duration-300 ${
                  open ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-current transition-opacity duration-300 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-current transition-transform duration-300 ${
                  open ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </header>
      {mobileMenu}
    </>
  );
}
