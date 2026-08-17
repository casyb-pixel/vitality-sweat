import type { PreferredSplit } from "@/lib/fitness/types";

export type CustomDayDraft = {
  label: string;
  focus: string | null;
};

const UPPER_LOWER = ["Upper", "Lower"] as const;
const PPL = ["Push", "Pull", "Legs"] as const;

export function defaultDayDrafts(
  daysPerWeek: number,
  split: PreferredSplit | null,
  overrides?: Array<{ label?: string; focus?: string | null }>,
): CustomDayDraft[] {
  const count = Math.min(7, Math.max(1, daysPerWeek));
  const drafts: CustomDayDraft[] = [];
  for (let i = 0; i < count; i += 1) {
    const override = overrides?.[i];
    const generated = generatedDay(i, count, split);
    drafts.push({
      label: override?.label?.trim() || generated.label,
      focus:
        override?.focus === undefined
          ? generated.focus
          : override.focus?.trim() || null,
    });
  }
  return drafts;
}

function generatedDay(
  index: number,
  count: number,
  split: PreferredSplit | null,
): CustomDayDraft {
  if (split === "upper_lower") {
    const label = UPPER_LOWER[index % UPPER_LOWER.length]!;
    return { label, focus: label.toLowerCase() };
  }
  if (split === "push_pull_legs") {
    const label = PPL[index % PPL.length]!;
    return { label, focus: label.toLowerCase() };
  }
  if (split === "full_body") {
    return {
      label: count === 1 ? "Full body" : `Full body ${index + 1}`,
      focus: "full body",
    };
  }
  return {
    label: `Day ${index + 1}`,
    focus: null,
  };
}
