import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVideoGrowthPromoPack } from "../marketing/growth-packaging";
import { absoluteUrl } from "../seo/site";

describe("video growth pack Chronicle URL", () => {
  it("puts the absolute blog URL in the description and Facebook caption", () => {
    const pack = buildVideoGrowthPromoPack({
      blogTitle: "Sleep is the cheat code",
      conceptTitle: "Hunter's sleep rant",
      blogSlug: "sleep-is-the-cheat-code",
    });
    const expected = absoluteUrl("/blog/sleep-is-the-cheat-code");
    assert.match(pack.descriptionWithAppLink, /Read more:/);
    assert.ok(pack.descriptionWithAppLink.includes(expected));
    assert.ok(pack.captionVariants.facebook.includes(expected));
  });
});
