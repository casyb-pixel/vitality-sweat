import { NUTRITION_SAFETY_BANNER } from "@/lib/legal/terms-2026-08-14";

export default function NutritionSafetyBanner({
  text = NUTRITION_SAFETY_BANNER,
}: {
  text?: string;
}) {
  return (
    <p
      role="note"
      className="border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 font-sans text-sm leading-relaxed text-brand-ink"
    >
      {text}
    </p>
  );
}
