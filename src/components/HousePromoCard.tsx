import Image from "next/image";
import Link from "next/link";
import { trackCtaClick } from "@/lib/analytics/ga";
import type { HousePromo } from "@/lib/sponsors/house-promos";
import type { SponsorSlotSize } from "@/lib/sponsors/slots";

type HousePromoCardProps = {
  promo: HousePromo;
  href: string;
  slotId: string;
  size: SponsorSlotSize;
};

export default function HousePromoCard({
  promo,
  href,
  slotId,
  size,
}: HousePromoCardProps) {
  const stacked = size === "rectangle";

  return (
    <Link
      href={href}
      onClick={() => trackCtaClick(`house_${slotId}`, promo.ctaLabel)}
      className={`group relative block overflow-hidden border border-brand-ink/10 bg-surface-dark text-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:-translate-y-0.5 ${
        stacked
          ? "max-w-[22rem]"
          : "w-full"
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 z-20 w-1.5 bg-brand-orange"
      />
      <div
        className={
          stacked
            ? "grid"
            : "grid sm:grid-cols-[minmax(11rem,40%)_1fr]"
        }
      >
        <div className="relative min-h-[10.5rem] overflow-hidden sm:min-h-[12.5rem]">
          <Image
            src={promo.imageSrc}
            alt={promo.imageAlt}
            fill
            sizes={
              stacked
                ? "352px"
                : "(max-width: 640px) 100vw, 40vw"
            }
            className={`${promo.imageClassName} transition-transform duration-700 group-hover:scale-105`}
          />
          <div
            aria-hidden
            className={
              stacked
                ? "absolute inset-0 bg-gradient-to-t from-surface-dark/20 via-transparent to-transparent"
                : "absolute inset-0 bg-gradient-to-t from-surface-dark/15 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-surface-dark/55"
            }
          />
        </div>
        <div className="relative flex flex-col justify-center px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-3 inline-flex w-fit bg-white px-2 py-1">
            <Image
              src="/branding/logo-original-transparent.svg"
              alt="Vitality Sweat"
              width={110}
              height={32}
              className="h-6 w-auto"
            />
          </div>
          <p className="eyebrow text-brand-orange">{promo.eyebrow}</p>
          <p className="mt-2 font-display text-[clamp(1.35rem,3vw,1.85rem)] leading-[1.1] text-balance">
            {promo.headline}
          </p>
          <p className="mt-2 max-w-lg font-sans text-sm leading-relaxed text-white/80">
            {promo.body}
          </p>
          <span className="mt-4 inline-flex w-fit items-center bg-brand-orange px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white transition-colors group-hover:bg-brand-orange-deep">
            {promo.ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
