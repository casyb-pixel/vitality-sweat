import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDemoSponsor } from "./serve";

describe("isDemoSponsor", () => {
  it("skips seeded pitch-deck sponsors", () => {
    assert.equal(isDemoSponsor({ slug: "reds-gym-demo", name: "Red's Gym (Demo)" }), true);
    assert.equal(isDemoSponsor({ slug: "vitality-engine-house", name: "Vitality Engine (House)" }), false);
    assert.equal(isDemoSponsor({ slug: "rouses", name: "Rouses" }), false);
  });
});
