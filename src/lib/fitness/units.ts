import type { UnitSystem } from "@/lib/fitness/types";

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function milesToMeters(mi: number): number {
  return mi * 1609.344;
}

export function formatWeight(
  weightLb: number | null | undefined,
  units: UnitSystem,
): string {
  if (weightLb == null || !Number.isFinite(weightLb)) return "-";
  if (units === "metric") {
    return `${(Math.round(lbToKg(weightLb) * 10) / 10).toFixed(1)} kg`;
  }
  return `${Math.round(weightLb * 10) / 10} lb`;
}

export function displayWeightValue(
  weightLb: number,
  units: UnitSystem,
): number {
  if (units === "metric") return Math.round(lbToKg(weightLb) * 10) / 10;
  return Math.round(weightLb * 10) / 10;
}

export function inputWeightToLb(value: number, units: UnitSystem): number {
  return units === "metric" ? kgToLb(value) : value;
}
