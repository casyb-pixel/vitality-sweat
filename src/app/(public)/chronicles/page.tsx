import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";

export const metadata: Metadata = {
  title: "The Sweatlife Chronicles",
  description:
    "Stories, training notes, and performance nutrition from the Vitality Sweat community.",
};

export default function ChroniclesPage() {
  return (
    <div className="bg-surface">
      <section className="relative isolate min-h-[42vh] overflow-hidden bg-surface-dark text-white">
        <Image
          src="/images/stock/graphics/blog-workout-plan-energy.png"
          alt="Vitality Sweat workout energy graphic"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50"
        />
        <div aria-hidden className="absolute inset-0 bg-brand-ink/70" />
        <div className="site-shell relative flex min-h-[42vh] flex-col justify-end pb-14 pt-24">
          <p className="eyebrow text-brand-orange">Blog</p>
          <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.95]">
            The Sweatlife Chronicles
          </h1>
          <p className="mt-4 max-w-xl font-sans text-lg text-white/85">
            Training truths, nutrition that travels, and field notes from
            Hunter&apos;s coaching life.
          </p>
        </div>
      </section>

      <div className="section-y site-shell space-y-10">
        <AdSlot slotId="chronicles-top" size="banner" />
        <article className="max-w-2xl">
          <p className="font-sans text-lg leading-relaxed text-brand-muted">
            Chronicles posts are coming soon to this Next.js home. Until then,
            explore the training pillars on the{" "}
            <Link
              href="/"
              className="font-semibold text-brand-orange hover:text-brand-orange-deep"
            >
              Vitality Sweat home page
            </Link>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
