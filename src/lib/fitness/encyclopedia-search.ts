/**
 * Client-safe encyclopedia search. Ranking operates on slim hits so the
 * Lift Finder does not import the full page catalog.
 */

import type {
  EncyclopediaCluster,
  EncyclopediaPage,
} from "@/lib/fitness/encyclopedia";

export type EncyclopediaEquipment = EncyclopediaPage["equipment"];

export type EncyclopediaSearchHit = {
  slug: string;
  name: string;
  eyebrow: string;
  primaryMuscle: string;
  equipment: EncyclopediaEquipment;
  cluster: EncyclopediaCluster;
  cue: string;
  searchText: string;
};

export type EncyclopediaSearchFilters = {
  muscle?: string;
  equipment?: EncyclopediaEquipment | "";
};

export const EQUIPMENT_LABELS: Record<EncyclopediaEquipment, string> = {
  free_weight: "Free weight",
  machine: "Machine",
  bodyweight: "Bodyweight",
};

export const EQUIPMENT_ORDER: EncyclopediaEquipment[] = [
  "free_weight",
  "machine",
  "bodyweight",
];

export function muscleLabel(muscle: string): string {
  const spaced = muscle.replace(/_/g, " ").trim();
  if (!spaced) return muscle;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function equipmentLabel(equipment: EncyclopediaEquipment): string {
  return EQUIPMENT_LABELS[equipment];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toEncyclopediaSearchHit(
  page: EncyclopediaPage,
): EncyclopediaSearchHit {
  const cue = page.cues[0] ?? page.lede;
  const searchText = normalize(
    [
      page.name,
      page.slug.replace(/-/g, " "),
      page.eyebrow,
      page.primaryMuscle.replace(/_/g, " "),
      page.equipment.replace(/_/g, " "),
      page.lede,
      page.description,
      ...page.cues,
    ].join(" "),
  );
  return {
    slug: page.slug,
    name: page.name,
    eyebrow: page.eyebrow,
    primaryMuscle: page.primaryMuscle,
    equipment: page.equipment,
    cluster: page.cluster,
    cue,
    searchText,
  };
}

export function pagesToSearchIndex(
  pages: EncyclopediaPage[],
): EncyclopediaSearchHit[] {
  return pages.map(toEncyclopediaSearchHit);
}

export function encyclopediaMuscleGroups(
  hits: EncyclopediaSearchHit[],
): string[] {
  return [...new Set(hits.map((hit) => hit.primaryMuscle))].sort((a, b) =>
    muscleLabel(a).localeCompare(muscleLabel(b)),
  );
}

function scoreHit(hit: EncyclopediaSearchHit, query: string): number {
  const q = normalize(query);
  if (!q) return 1;
  const tokens = q.split(" ").filter(Boolean);
  const name = normalize(hit.name);
  const slug = normalize(hit.slug.replace(/-/g, " "));
  const eyebrow = normalize(hit.eyebrow);
  const muscle = normalize(hit.primaryMuscle.replace(/_/g, " "));
  const equipment = normalize(hit.equipment.replace(/_/g, " "));

  if (name === q || slug === q) return 100;
  if (name.startsWith(q) || slug.startsWith(q)) return 90;
  if (tokens.every((token) => name.includes(token))) {
    return tokens.length === 1 ? 80 : 84;
  }
  if (name.includes(q) || slug.includes(q)) return 75;
  if (eyebrow.startsWith(q) || eyebrow.includes(q)) return 62;
  if (muscle === q || muscle.startsWith(q) || muscle.includes(q)) return 55;
  if (equipment === q || equipment.startsWith(q)) return 70;
  if (equipment.includes(q)) return 50;
  if (tokens.every((token) => hit.searchText.includes(token))) return 40;
  return 0;
}

function matchesFilters(
  hit: EncyclopediaSearchHit,
  filters?: EncyclopediaSearchFilters,
): boolean {
  if (!filters) return true;
  if (filters.muscle && hit.primaryMuscle !== filters.muscle) return false;
  if (filters.equipment && hit.equipment !== filters.equipment) return false;
  return true;
}

/**
 * Rank encyclopedia hits for a typed query. Empty query with no filters
 * returns []. Empty query with muscle/equipment filters returns that slice.
 */
export function searchEncyclopedia(
  hits: EncyclopediaSearchHit[],
  query: string,
  filters?: EncyclopediaSearchFilters,
): EncyclopediaSearchHit[] {
  const filtered = hits.filter((hit) => matchesFilters(hit, filters));
  const q = query.trim();
  if (!q) {
    if (!filters?.muscle && !filters?.equipment) return [];
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  const ranked = filtered
    .map((hit) => ({ hit, score: scoreHit(hit, q) }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.hit.name.localeCompare(b.hit.name),
    );

  const seen = new Set<string>();
  const unique: EncyclopediaSearchHit[] = [];
  for (const row of ranked) {
    if (seen.has(row.hit.slug)) continue;
    seen.add(row.hit.slug);
    unique.push(row.hit);
  }
  return unique;
}
