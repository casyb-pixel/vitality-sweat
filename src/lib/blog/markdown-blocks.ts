import type { BlogBlock } from "@/data/posts";

/**
 * Convert archive-compatible BlogBlock[] ↔ markdown used by Blog Builder.
 * Matches the renderer in `src/app/blog/[slug]/page.tsx` (h2/h3/p/ul/image).
 */

export function blocksToMarkdown(blocks: BlogBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "h2":
        lines.push(`## ${block.text}`, "");
        break;
      case "h3":
        lines.push(`### ${block.text}`, "");
        break;
      case "ul":
        for (const item of block.items) {
          lines.push(`- ${item}`);
        }
        lines.push("");
        break;
      case "image":
        lines.push(`![${block.alt || ""}](${block.src})`, "");
        break;
      default:
        lines.push(block.text, "");
        break;
    }
  }

  return lines.join("\n").trim() + "\n";
}

export function markdownToBlocks(markdown: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraphBuf: string[] = [];
  let listBuf: string[] = [];

  const flushParagraph = () => {
    const text = paragraphBuf.join(" ").trim();
    paragraphBuf = [];
    if (text) blocks.push({ type: "p", text });
  };

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push({ type: "ul", items: [...listBuf] });
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    // Skip HTML comments (e.g. growth CTA markers).
    if (/^<!--[\s\S]*-->$/.test(trimmed)) {
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imageMatch) {
      flushList();
      flushParagraph();
      blocks.push({
        type: "image",
        alt: imageMatch[1] || "",
        src: imageMatch[2],
      });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      flushParagraph();
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listBuf.push(trimmed.replace(/^[-*]\s+/, "").trim());
      continue;
    }

    flushList();
    paragraphBuf.push(trimmed);
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function injectLeadingImage(
  blocks: BlogBlock[],
  image: { src: string; alt: string },
): BlogBlock[] {
  const withoutLeadingDuplicate = blocks.filter(
    (block, index) => !(index === 0 && block.type === "image"),
  );
  return [{ type: "image", ...image }, ...withoutLeadingDuplicate];
}
