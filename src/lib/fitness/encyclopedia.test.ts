import test from "node:test";
import assert from "node:assert/strict";
import {
  ENCYCLOPEDIA_PAGES,
  encyclopediaSlugs,
  featuredEncyclopediaPages,
  FEATURED_ENCYCLOPEDIA_BATCH,
  getEncyclopediaPage,
} from "./encyclopedia";
import { ENCYCLOPEDIA_BATCH_2026_08_18 } from "./encyclopedia-batch-2026-08-18";
import { TOOLS } from "../tools/catalog";

const THIS_WEEK_TOOL_SLUGS = [
  "heart-rate-zones",
  "running-pace",
  "bmi",
  "creatine-dose",
] as const;

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
  const tools = THIS_WEEK_TOOL_SLUGS.length;
  const total = ENCYCLOPEDIA_BATCH_2026_08_18.length + tools;
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
  const blob = `${pageText(ENCYCLOPEDIA_BATCH_2026_08_18)} ${pageText(
    TOOLS.filter((tool) =>
      (THIS_WEEK_TOOL_SLUGS as readonly string[]).includes(tool.slug),
    ),
  )}`;
  for (const phrase of BANNED) {
    assert.equal(blob.includes(phrase), false, phrase);
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
  for (const page of ENCYCLOPEDIA_BATCH_2026_08_18) {
    assert.equal(
      featured.some((row) => row.slug === page.slug),
      false,
      `${page.slug} should not flood start here`,
    );
  }
});
