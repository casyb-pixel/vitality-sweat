import Image from "next/image";
import Link from "next/link";

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
            width={140}
            height={40}
            sizes="140px"
            className="h-9 w-auto"
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
        <p className="font-sans text-sm text-brand-muted">
          © {new Date().getFullYear()} Vitality Sweat. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
