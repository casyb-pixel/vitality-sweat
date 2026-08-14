import {
  HEALTH_FITNESS_DISCLAIMER_BLOCKS,
  HEALTH_FITNESS_DISCLAIMER_TITLE,
} from "@/lib/legal/terms-2026-08-14";

export default function HealthFitnessDisclaimer({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <aside
      className={
        compact
          ? "mt-8 border border-brand-ink/10 bg-surface-elevated px-4 py-4"
          : "mt-10 border border-brand-ink/10 bg-surface-elevated px-5 py-6"
      }
      aria-label="Health and fitness disclaimer"
    >
      <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
        Disclaimer
      </p>
      <h2 className="mt-2 font-display text-lg leading-tight text-brand-ink sm:text-xl">
        {HEALTH_FITNESS_DISCLAIMER_TITLE}
      </h2>
      <div className="mt-3 space-y-3">
        {HEALTH_FITNESS_DISCLAIMER_BLOCKS.map((block, index) => {
          if (block.type === "h3") {
            return (
              <h3
                key={`${block.text}-${index}`}
                className="font-sans text-sm font-bold text-brand-ink"
              >
                {block.text}
              </h3>
            );
          }
          if (block.type === "ul") {
            return (
              <ul
                key={`ul-${index}`}
                className="list-disc space-y-1 pl-5 font-sans text-sm leading-relaxed text-brand-muted"
              >
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p
              key={`p-${index}`}
              className="font-sans text-sm leading-relaxed text-brand-muted"
            >
              {block.text}
            </p>
          );
        })}
      </div>
    </aside>
  );
}
