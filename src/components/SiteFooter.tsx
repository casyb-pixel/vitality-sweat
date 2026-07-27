import Image from "next/image";
import Link from "next/link";
import { SOCIAL_LINKS } from "@/lib/seo/site";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/return-policy", label: "Return Policy" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-ink/10 bg-surface-elevated py-10">
      <div className="site-shell flex flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Image
            src="/branding/logo-black-transparent.svg"
            alt="Vitality Sweat"
            width={220}
            height={54}
            sizes="220px"
            className="h-12 w-auto sm:h-14"
          />
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
          </nav>
        </div>

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
          © {new Date().getFullYear()} Vitality Sweat. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
