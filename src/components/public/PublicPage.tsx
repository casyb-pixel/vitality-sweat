import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function PublicPage({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="bg-surface">
        <section className="site-shell section-y">
          <p className="eyebrow text-brand-orange">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.8rem)] leading-[0.95] text-brand-ink">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-base text-brand-muted">
            {lede}
          </p>
          <p className="mt-4">
            <Link
              href="/app"
              className="font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-orange"
            >
              Open the free Vitality Engine
            </Link>
          </p>
          <div className="mt-10">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
