/** Next exercise index inside a superset/circuit, or null when the round ends (rest). */
export function nextSupersetIndex(
  exercises: { superset_group?: string | null }[],
  currentIndex: number,
): number | null {
  const group = exercises[currentIndex]?.superset_group?.trim();
  if (!group) return null;
  const idxs = exercises
    .map((ex, i) => (ex.superset_group === group ? i : -1))
    .filter((i) => i >= 0);
  if (idxs.length < 2) return null;
  const pos = idxs.indexOf(currentIndex);
  if (pos < 0) return null;
  const nextPos = (pos + 1) % idxs.length;
  if (nextPos === 0) return null;
  return idxs[nextPos] ?? null;
}
