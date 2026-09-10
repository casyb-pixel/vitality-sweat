import test from "node:test";
import assert from "node:assert/strict";
import {
  ENCYCLOPEDIA_PAGES,
  encyclopediaSlugs,
  featuredEncyclopediaPages,
  FEATURED_ENCYCLOPEDIA_BATCH,
  getEncyclopediaPage,
} from "./encyclopedia";
import {
  pagesToSearchIndex,
  searchEncyclopedia,
} from "./encyclopedia-search";
import { ENCYCLOPEDIA_BATCH_2026_08_18 } from "./encyclopedia-batch-2026-08-18";
import { ENCYCLOPEDIA_BATCH_2026_08_25 } from "./encyclopedia-batch-2026-08-25";
import { ENCYCLOPEDIA_BATCH_2026_08_25B } from "./encyclopedia-batch-2026-08-25b";
import { ENCYCLOPEDIA_BATCH_2026_09_10 } from "./encyclopedia-batch-2026-09-10";
import { TOOLS } from "../tools/catalog";

const THIS_WEEK_TOOL_SLUGS = ["tdee"] as const;

const BANNED = [
  "hey guys",
  "in this video i will",
  "without further ado",
  "let's dive in",
  "clinically proven",
  "diagnose",
  "cure",
  "treat disease",
  "perfect body",
];

function pageText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

test("this week ships 10-20 encyclopedia pages (exercises plus tools)", () => {
  const total = ENCYCLOPEDIA_BATCH_2026_09_10.length;
  assert.ok(total >= 10 && total <= 20, `got ${total} pages`);
});

test("encyclopedia copy has no typographic dashes", () => {
  const raw = JSON.stringify(ENCYCLOPEDIA_PAGES);
  assert.equal(raw.includes("\u2014"), false);
  assert.equal(raw.includes("\u2013"), false);
});

test("each exercise page has an Engine CTA and internal links that exist", () => {
  for (const page of ENCYCLOPEDIA_PAGES) {
    assert.match(page.engineCta, /Engine/);
    for (const slug of page.relatedSlugs) {
      assert.ok(
        getEncyclopediaPage(slug),
        `${page.slug} points at missing ${slug}`,
      );
    }
    for (const toolSlug of page.relatedTools) {
      assert.ok(
        TOOLS.some((tool) => tool.slug === toolSlug),
        `${page.slug} points at missing tool ${toolSlug}`,
      );
    }
  }
});

test("this week's tool pages have Engine CTAs and no typographic dashes", () => {
  for (const slug of THIS_WEEK_TOOL_SLUGS) {
    const tool = TOOLS.find((row) => row.slug === slug);
    assert.ok(tool, slug);
    assert.ok(tool!.engineCta?.includes("Engine"), slug);
    const raw = JSON.stringify(tool);
    assert.equal(raw.includes("\u2014"), false, slug);
    assert.equal(raw.includes("\u2013"), false, slug);
  }
});

test("copy stays coaching, not medical theater", () => {
  const blob = `${pageText(ENCYCLOPEDIA_BATCH_2026_09_10)} ${pageText(
    TOOLS.filter((tool) =>
      (THIS_WEEK_TOOL_SLUGS as readonly string[]).includes(tool.slug),
    ),
  )}`;
  for (const phrase of BANNED) {
    assert.equal(blob.includes(phrase), false, phrase);
  }
});

test("this week's exercise batch is 20 pages with a review date", () => {
  assert.equal(ENCYCLOPEDIA_BATCH_2026_09_10.length, 20);
  for (const page of ENCYCLOPEDIA_BATCH_2026_09_10) {
    assert.equal(page.batch, "2026-09-10", page.slug);
  }
});

test("encyclopedia slugs are unique", () => {
  const slugs = encyclopediaSlugs();
  assert.equal(new Set(slugs).size, slugs.length);
});

test("start-here hub stays on the first beginner batch", () => {
  const featured = featuredEncyclopediaPages();
  assert.ok(featured.length > 0);
  for (const page of featured) {
    assert.equal(page.cluster, "beginner");
    assert.equal(page.batch ?? FEATURED_ENCYCLOPEDIA_BATCH, FEATURED_ENCYCLOPEDIA_BATCH);
  }
  for (const page of [
    ...ENCYCLOPEDIA_BATCH_2026_08_18,
    ...ENCYCLOPEDIA_BATCH_2026_08_25,
    ...ENCYCLOPEDIA_BATCH_2026_08_25B,
    ...ENCYCLOPEDIA_BATCH_2026_09_10,
  ]) {
    assert.equal(
      featured.some((row) => row.slug === page.slug),
      false,
      `${page.slug} should not flood start here`,
    );
  }
});

test("encyclopedia search ranks goblet and row by name", () => {
  const hits = pagesToSearchIndex(ENCYCLOPEDIA_PAGES);
  const goblet = searchEncyclopedia(hits, "goblet");
  assert.ok(goblet.length > 0);
  assert.equal(goblet[0]?.slug, "goblet-squat");

  const rows = searchEncyclopedia(hits, "row");
  assert.ok(rows.length >= 3);
  assert.ok(rows.every((hit) => hit.slug.includes("row") || hit.searchText.includes("row")));
  const slugs = rows.map((hit) => hit.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("encyclopedia search matches muscle and equipment filters", () => {
  const hits = pagesToSearchIndex(ENCYCLOPEDIA_PAGES);
  const quads = searchEncyclopedia(hits, "quads");
  assert.ok(quads.length > 0);
  assert.ok(quads.some((hit) => hit.primaryMuscle === "quads"));

  const bodyweight = searchEncyclopedia(hits, "bodyweight");
  assert.ok(bodyweight.length > 0);
  assert.equal(bodyweight[0]?.equipment, "bodyweight");
  const byEquipment = searchEncyclopedia(hits, "", { equipment: "bodyweight" });
  assert.ok(byEquipment.length > 0);
  assert.ok(byEquipment.every((hit) => hit.equipment === "bodyweight"));

  const filtered = searchEncyclopedia(hits, "", { muscle: "quads" });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((hit) => hit.primaryMuscle === "quads"));
  const filterSlugs = filtered.map((hit) => hit.slug);
  assert.equal(new Set(filterSlugs).size, filterSlugs.length);

  const empty = searchEncyclopedia(hits, "");
  assert.equal(empty.length, 0);
});
