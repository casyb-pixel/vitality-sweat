import Image from "next/image";
import Link from "next/link";

export default function CreatorAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full bg-surface">
      <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-surface-elevated/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-site items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/app/creator" className="flex items-center gap-2">
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
              Studio
            </span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/chronicles"
              className="font-sans text-xs font-semibold text-brand-muted hover:text-brand-orange sm:text-sm"
            >
              Chronicles
            </Link>
            <Link
              href="/"
              className="font-sans text-xs font-semibold text-brand-ink hover:text-brand-orange sm:text-sm"
            >
              Exit
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-site px-4 sm:px-6">{children}</div>
    </div>
  );
}
