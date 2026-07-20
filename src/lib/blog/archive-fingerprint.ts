import type { BlogBlock, MigratedPost } from "@/data/posts";
import { getAllBlogPosts } from "@/lib/blog/posts";

export type ArchiveFingerprint = {
  sampleSize: number;
  baselineSlug: string;
  avgWordCount: number;
  targetWordCountMin: number;
  targetWordCountMax: number;
  avgParagraphs: number;
  avgH2: number;
  avgH3: number;
  avgLists: number;
  avgImages: number;
  avgParagraphChars: number;
  h2EveryNParagraphs: number;
  h3PerH2: number;
  cadenceNotes: string[];
  toneNotes: string[];
  exampleH2s: string[];
  exampleH3s: string[];
};

function wordCountFromBlocks(blocks: BlogBlock[]): number {
  let words = 0;
  for (const block of blocks) {
    if (block.type === "p" || block.type === "h2" || block.type === "h3") {
      words += block.text.trim().split(/\s+/).filter(Boolean).length;
    } else if (block.type === "ul") {
      for (const item of block.items) {
        words += item.trim().split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return words;
}

function analyzePost(post: MigratedPost) {
  const counts = { h2: 0, h3: 0, p: 0, ul: 0, image: 0, paragraphChars: 0 };
  const h2s: string[] = [];
  const h3s: string[] = [];

  for (const block of post.body) {
    if (block.type === "h2") {
      counts.h2 += 1;
      h2s.push(block.text);
    } else if (block.type === "h3") {
      counts.h3 += 1;
      h3s.push(block.text);
    } else if (block.type === "p") {
      counts.p += 1;
      counts.paragraphChars += block.text.length;
    } else if (block.type === "ul") {
      counts.ul += 1;
    } else if (block.type === "image") {
      counts.image += 1;
    }
  }

  return {
    words: wordCountFromBlocks(post.body),
    ...counts,
    h2s,
    h3s,
  };
}

/**
 * Structural + tonal fingerprint extracted from migrated Sweatlife Chronicles
 * (calorie-deficit baseline + Blogger archive). Used as the structural editor
 * brief for Creator Studio refinements.
 */
export function getArchiveFingerprint(
  posts: MigratedPost[] = getAllBlogPosts(),
): ArchiveFingerprint {
  const sample = posts.slice(0, Math.min(posts.length, 14));
  const analyses = sample.map(analyzePost);
  const n = analyses.length || 1;

  const sum = analyses.reduce(
    (acc, a) => ({
      words: acc.words + a.words,
      p: acc.p + a.p,
      h2: acc.h2 + a.h2,
      h3: acc.h3 + a.h3,
      ul: acc.ul + a.ul,
      image: acc.image + a.image,
      paragraphChars: acc.paragraphChars + a.paragraphChars,
    }),
    { words: 0, p: 0, h2: 0, h3: 0, ul: 0, image: 0, paragraphChars: 0 },
  );

  const avgWordCount = Math.round(sum.words / n);
  const avgParagraphs = Number((sum.p / n).toFixed(1));
  const avgH2 = Number((sum.h2 / n).toFixed(1));
  const avgH3 = Number((sum.h3 / n).toFixed(1));
  const avgLists = Number((sum.ul / n).toFixed(1));
  const avgImages = Number((sum.image / n).toFixed(1));
  const avgParagraphChars = Math.round(
    sum.paragraphChars / Math.max(sum.p, 1),
  );

  const h2EveryNParagraphs =
    avgH2 > 0 ? Number((avgParagraphs / avgH2).toFixed(1)) : 4;
  const h3PerH2 = avgH2 > 0 ? Number((avgH3 / avgH2).toFixed(1)) : 2;

  const exampleH2s = sample
    .flatMap((p) => p.body.filter((b) => b.type === "h2").map((b) => b.text))
    .slice(0, 8);
  const exampleH3s = sample
    .flatMap((p) => p.body.filter((b) => b.type === "h3").map((b) => b.text))
    .slice(0, 10);

  return {
    sampleSize: sample.length,
    baselineSlug: "calorie-deficit-weight-loss-golden-rule",
    avgWordCount,
    targetWordCountMin: Math.max(700, avgWordCount - 250),
    targetWordCountMax: avgWordCount + 350,
    avgParagraphs,
    avgH2,
    avgH3,
    avgLists,
    avgImages,
    avgParagraphChars,
    h2EveryNParagraphs,
    h3PerH2,
    cadenceNotes: [
      "Open with 1–2 explanatory paragraphs before the first H2/H3 (calorie-deficit pattern).",
      `Aim for ~${avgH2} H2 major sections and ~${avgH3} H3 supporting beats.`,
      `Insert an H2 about every ${h2EveryNParagraphs} paragraphs; nest ~${h3PerH2} H3s under each H2.`,
      "Interleave short instructional lists after H3 tips sections (meal planning / pitfalls cadence).",
      "Place editorial images between major beats — not stacked back-to-back without copy.",
      `Typical paragraph length ~${avgParagraphChars} characters; keep sentences direct and practical.`,
    ],
    toneNotes: [
      "Direct, sweaty, encouraging coach voice — never corporate fluff.",
      "Explain the ‘why’, then give actionable how-to steps.",
      "Speak to athletes, parents of youth baseball players, and everyday fitness readers.",
      "Use Vitality Sweat / Sweatlife Chronicles language; Southwest Louisiana grit welcome.",
      "Prefer clarity over jargon; quantify when helpful (ranges, times, portions).",
    ],
    exampleH2s,
    exampleH3s,
  };
}

export function fingerprintSummary(fp: ArchiveFingerprint = getArchiveFingerprint()): string {
  return [
    `Archive sample: ${fp.sampleSize} posts (baseline ${fp.baselineSlug})`,
    `Target length: ${fp.targetWordCountMin}–${fp.targetWordCountMax} words (avg ${fp.avgWordCount})`,
    `Structure: ~${fp.avgH2} H2 / ~${fp.avgH3} H3 / ~${fp.avgParagraphs} paragraphs / ~${fp.avgLists} lists / ~${fp.avgImages} images`,
    `Cadence: H2 every ~${fp.h2EveryNParagraphs} paragraphs; ~${fp.h3PerH2} H3 per H2`,
  ].join(" · ");
}
