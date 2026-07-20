type AdSlotProps = {
  slotId: string;
  label?: string;
  size?: "banner" | "rectangle" | "leaderboard";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<AdSlotProps["size"]>, string> = {
  banner: "min-h-[90px] max-w-[728px]",
  rectangle: "min-h-[250px] max-w-[300px]",
  leaderboard: "min-h-[90px] w-full max-w-[970px]",
};

/**
 * Native AdSense-ready slot shell.
 * Replace inner content with the AdSense <ins> snippet when IDs are live.
 */
export default function AdSlot({
  slotId,
  label = "Advertisement",
  size = "banner",
  className = "",
}: AdSlotProps) {
  return (
    <aside
      aria-label={label}
      data-ad-slot={slotId}
      className={`mx-auto w-full ${SIZE_CLASS[size]} ${className}`}
    >
      <div className="flex h-full min-h-[inherit] w-full flex-col items-center justify-center border border-dashed border-brand-muted/35 bg-surface-elevated/70 px-4 py-6 text-center">
        <p className="eyebrow mb-2 text-[0.7rem] text-brand-muted/80">
          {label}
        </p>
        <p className="max-w-xs font-sans text-sm text-brand-muted">
          Sponsored placement — AdSense slot{" "}
          <span className="font-semibold text-brand-ink/70">{slotId}</span>
        </p>
      </div>
    </aside>
  );
}
