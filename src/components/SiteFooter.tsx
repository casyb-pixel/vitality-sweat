import Image from "next/image";
import Link from "next/link";
import { SITE_NAME, SOCIAL_LINKS } from "@/lib/seo/site";

const SITE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/chronicles", label: "The Sweatlife Chronicles" },
  { href: "/tools", label: "Tools" },
  { href: "/train", label: "Train" },
  { href: "/fuel", label: "Fuel" },
  { href: "/exercises", label: "Exercises" },
  { href: "/programs", label: "Programs" },
  { href: "/gear", label: "Gear" },
  { href: "/search", label: "Search" },
  { href: "/store", label: "Store" },
  { href: "/advertise", label: "Advertise" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/return-policy", label: "Return Policy" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-ink/10 bg-surface-elevated py-10">
      <div className="site-shell flex flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="group flex flex-col gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange"
          >
            <Image
              src="/branding/logo-black-transparent.svg"
              alt=""
              width={220}
              height={54}
              sizes="220px"
              className="h-12 w-auto sm:h-14"
            />
            <span className="font-display text-xl text-brand-ink transition-colors group-hover:text-brand-orange">
              {SITE_NAME}
            </span>
          </Link>
          <nav
            aria-label="Site"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm font-semibold text-brand-ink transition-colors hover:text-brand-orange"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-sm font-semibold text-brand-ink transition-colors hover:text-brand-orange"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/about#contact"
            className="font-sans text-sm font-semibold text-brand-ink transition-colors hover:text-brand-orange"
          >
            Contact
          </Link>
        </nav>

        <nav aria-label="Social media" className="flex flex-wrap gap-x-5 gap-y-2">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:text-brand-orange"
            >
              {link.label}
              {"handle" in link && link.handle ? (
                <span className="ml-1 font-semibold normal-case tracking-normal text-brand-muted">
                  {link.handle}
                </span>
              ) : null}
            </a>
          ))}
        </nav>

        <p className="font-sans text-sm text-brand-muted">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
