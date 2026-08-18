export const LAST_GYM_STORAGE_KEY = "vs_last_gym_name";

export type GymOption = {
  id: string;
  name: string;
  metro: string | null;
  source: "partner" | "directory";
};

export function normalizeGymName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function gymNameKey(raw: string): string {
  return normalizeGymName(raw).toLowerCase();
}
