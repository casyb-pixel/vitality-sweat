import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  housePromoHref,
  isMemberAppPath,
  pickHousePromo,
} from "./house-promos";

describe("house promos", () => {
  it("maps known slots to Engine Room or Fuel", () => {
    assert.equal(pickHousePromo("home-below-hero").id, "engine-room");
    assert.equal(pickHousePromo("home-mid-content").id, "fuel");
    assert.equal(pickHousePromo("blog-mid-calorie-deficit").id, "fuel");
    assert.equal(pickHousePromo("app-home").id, "engine-room");
    assert.equal(pickHousePromo("tools-inline").id, "fuel");
  });

  it("keeps copy free of typographic dashes", () => {
    const engine = pickHousePromo("home-below-hero");
    const fuel = pickHousePromo("home-mid-content");
    for (const promo of [engine, fuel]) {
      const blob = `${promo.eyebrow} ${promo.headline} ${promo.body} ${promo.ctaLabel}`;
      assert.equal(blob.includes("\u2014"), false);
      assert.equal(blob.includes("\u2013"), false);
    }
  });

  it("sends public Engine Room traffic through signup", () => {
    const promo = pickHousePromo("chronicles-top");
    const href = housePromoHref(promo, { memberApp: false, slotId: "chronicles-top" });
    assert.ok(href.includes("auth=signup"));
    assert.ok(href.includes(encodeURIComponent("/app/engine-room")));
  });

  it("sends members straight into Engine Room and Fuel", () => {
    assert.equal(isMemberAppPath("/app"), true);
    assert.equal(isMemberAppPath("/fuel"), false);
    assert.equal(
      housePromoHref(pickHousePromo("app-home"), { memberApp: true }),
      "/app/engine-room",
    );
    assert.equal(
      housePromoHref(pickHousePromo("tools-inline"), { memberApp: true }),
      "/app/nutrition",
    );
    assert.equal(
      housePromoHref(pickHousePromo("tools-inline"), { memberApp: false }),
      "/fuel",
    );
  });
});
