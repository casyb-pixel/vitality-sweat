import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCustomVideoIdea, titleFromHunterNotes } from "./custom-idea";
import { normalizeVideoIdea, serializeVideoIdea } from "./normalize-idea";

describe("custom video idea", () => {
  it("titles from the first sentence", () => {
    assert.equal(
      titleFromHunterNotes("Hit a PR squat. Then joke about it."),
      "Hit a PR squat",
    );
  });

  it("builds a talking-head custom idea Hunter can persist", () => {
    const idea = buildCustomVideoIdea({
      notes: "Talk about why sleep beats another preworkout.",
    });
    assert.equal(idea.kind, "custom");
    assert.equal(idea.filmMode, "talking_head");
    assert.equal(idea.title, "Talk about why sleep beats another preworkout");
    const roundTrip = normalizeVideoIdea(serializeVideoIdea(idea));
    assert.equal(roundTrip?.kind, "custom");
    assert.equal(roundTrip?.filmMode, "talking_head");
    assert.equal(roundTrip?.shootingConcept, idea.shootingConcept);
  });
});
