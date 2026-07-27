import type { BlogBlock } from "@/data/posts";
import { markdownToBlocks } from "@/lib/blog/markdown-blocks";

export type BlogSectionOption = {
  id: string;
  label: string;
  level: 2 | 3;
};

/**
 * Stable heading id shared by ArticleBlocks / DynamicVideoEmbedder
 * and Creator Studio "Target Blog Section" dropdowns.
 */
export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return base || "section";
}

/**
 * Assign unique ids across a post body (duplicate titles get -2, -3, …).
 */
export function assignHeadingIds(
  blocks: BlogBlock[],
): Map<number, string> {
  const used = new Map<string, number>();
  const byIndex = new Map<number, string>();

  blocks.forEach((block, index) => {
    if (block.type !== "h2" && block.type !== "h3") return;
    const base = slugifyHeading(block.text);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    byIndex.set(index, count === 1 ? base : `${base}-${count}`);
  });

  return byIndex;
}

export function extractSectionOptionsFromBlocks(
  blocks: BlogBlock[],
): BlogSectionOption[] {
  const ids = assignHeadingIds(blocks);
  const options: BlogSectionOption[] = [];

  blocks.forEach((block, index) => {
    if (block.type !== "h2" && block.type !== "h3") return;
    const id = ids.get(index);
    if (!id) return;
    options.push({
      id,
      label: block.text,
      level: block.type === "h2" ? 2 : 3,
    });
  });

  return options;
}

export function extractSectionOptionsFromPostBody(input: {
  bodyBlocks?: unknown;
  bodyMarkdown?: string | null;
}): BlogSectionOption[] {
  const fromBlocks = Array.isArray(input.bodyBlocks)
    ? (input.bodyBlocks as BlogBlock[])
    : null;
  if (fromBlocks && fromBlocks.length > 0) {
    return extractSectionOptionsFromBlocks(fromBlocks);
  }
  const md = input.bodyMarkdown?.trim() ?? "";
  if (!md) return [];
  return extractSectionOptionsFromBlocks(markdownToBlocks(md));
}
