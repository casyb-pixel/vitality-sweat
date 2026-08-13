/** Standard US plate pairs loaded onto a barbell (each side). */
export const US_PLATE_LB = [45, 35, 25, 10, 5, 2.5] as const;

export type PlatePlan = {
  targetLb: number;
  barLb: number;
  perSide: { plate: number; count: number }[];
  remainderLb: number;
  exact: boolean;
};

export function platesForTarget(input: {
  targetLb: number;
  barLb?: number;
}): PlatePlan {
  const barLb = input.barLb && input.barLb > 0 ? input.barLb : 45;
  const targetLb = Math.max(barLb, input.targetLb);
  let remaining = (targetLb - barLb) / 2;
  const perSide: { plate: number; count: number }[] = [];

  for (const plate of US_PLATE_LB) {
    const count = Math.floor((remaining + 1e-9) / plate);
    if (count > 0) {
      perSide.push({ plate, count });
      remaining -= count * plate;
    }
  }

  const remainderLb = Math.round(remaining * 2 * 10) / 10;
  return {
    targetLb,
    barLb,
    perSide,
    remainderLb,
    exact: Math.abs(remainderLb) < 0.05,
  };
}
