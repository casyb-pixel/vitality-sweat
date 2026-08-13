/**
 * Epley estimated 1RM. Used in progress charts and the public calculator.
 * Not a measured max. Treat as a training estimate.
 */
export function estimatedOneRepMaxLb(
  weightLb: number,
  reps: number,
): number | null {
  if (!Number.isFinite(weightLb) || !Number.isFinite(reps)) return null;
  if (weightLb <= 0 || reps <= 0) return null;
  if (reps === 1) return roundTo(weightLb, 0.5);
  if (reps > 12) return null;
  return roundTo(weightLb * (1 + reps / 30), 0.5);
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function bestEstimatedOneRepMax(
  sets: { weight_lb?: number | null; reps?: number | null }[],
): number | null {
  let best: number | null = null;
  for (const set of sets) {
    if (set.weight_lb == null || set.reps == null) continue;
    const e1 = estimatedOneRepMaxLb(set.weight_lb, set.reps);
    if (e1 == null) continue;
    if (best == null || e1 > best) best = e1;
  }
  return best;
}
