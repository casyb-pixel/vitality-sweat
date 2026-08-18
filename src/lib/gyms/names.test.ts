import test from "node:test";
import assert from "node:assert/strict";
import { gymNameKey, normalizeGymName } from "./names";
import { swlaGymDirectoryRows } from "./swla-directory";

test("gym names trim and collapse spaces", () => {
  assert.equal(normalizeGymName("  Red's   Gym  "), "Red's Gym");
  assert.equal(gymNameKey("  Red's   Gym  "), "red's gym");
});

test("SWLA gym seed keys are unique and cover the corridor", () => {
  const rows = swlaGymDirectoryRows();
  const keys = rows.map((row) => row.name_key);
  assert.equal(new Set(keys).size, keys.length);
  const metros = new Set(rows.map((row) => row.metro));
  for (const metro of [
    "Lafayette",
    "Breaux Bridge",
    "Sulphur",
    "Lake Charles",
    "Alexandria",
    "Opelousas",
    "New Iberia",
  ]) {
    assert.equal(metros.has(metro), true, `missing ${metro}`);
  }
});
