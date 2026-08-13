import test from "node:test";
import assert from "node:assert/strict";
import { estimatedOneRepMaxLb } from "./one-rep-max";
import { platesForTarget } from "./plates";

test("Epley 1RM at 5 reps", () => {
  const est = estimatedOneRepMaxLb(225, 5);
  assert.ok(est != null);
  assert.equal(est, 262.5);
});

test("plate calculator 225 on a 45 bar", () => {
  const plan = platesForTarget({ targetLb: 225, barLb: 45 });
  assert.equal(plan.exact, true);
  assert.deepEqual(plan.perSide, [
    { plate: 45, count: 2 },
  ]);
});
