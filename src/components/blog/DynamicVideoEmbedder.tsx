import Image from "next/image";
import type { BlogBlock } from "@/lib/blog/posts";
import { assignHeadingIds } from "@/lib/blog/heading-anchor";
import type { BlogVideoEmbed } from "@/lib/blog/video-embeds";
import SectionVideoPlayer from "@/components/blog/SectionVideoPlayer";

type DynamicVideoEmbedderProps = {
  blocks: BlogBlock[];
  embeds?: BlogVideoEmbed[];
  /** Used as poster when a video has no custom thumbnail. */
  fallbackThumbnail?: string | null;
};

/**
 * Processes the Chronicle body stream, stamps stable heading ids, and
 * splices a responsive video preview directly under any heading whose id
 * matches an active published embed's `target_section_anchor`.
 */
export default function DynamicVideoEmbedder({
  blocks,
  embeds = [],
  fallbackThumbnail = null,
}: DynamicVideoEmbedderProps) {
  const headingIds = assignHeadingIds(blocks);
  const embedByAnchor = new Map<string, BlogVideoEmbed>();
  for (const embed of embeds) {
    const key = embed.targetSectionAnchor.trim();
    if (!key || embedByAnchor.has(key)) continue;
    embedByAnchor.set(key, embed);
  }

  if (!blocks.length) {
    return (
      <p className="font-sans text-lg leading-relaxed text-brand-muted">
        This article doesn&apos;t have body content yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        const headingId = headingIds.get(index);
        const matchedEmbed =
          headingId && embedByAnchor.has(headingId)
            ? embedByAnchor.get(headingId)
            : undefined;

        switch (block.type) {
          case "h2":
            return (
              <div key={key} className="space-y-5">
                <h2
                  id={headingId}
                  className="scroll-mt-[calc(var(--header-h)+1rem)] pt-4 font-display text-[clamp(1.65rem,3vw,2.15rem)] leading-[1.15] text-brand-ink"
                >
                  {block.text}
                </h2>
                {matchedEmbed ? (
                  <SectionVideoPlayer
                    embed={matchedEmbed}
                    fallbackThumbnail={fallbackThumbnail}
                  />
                ) : null}
              </div>
            );
          case "h3":
            return (
              <div key={key} className="space-y-5">
                <h3
                  id={headingId}
                  className="scroll-mt-[calc(var(--header-h)+1rem)] pt-2 font-display text-xl text-brand-ink sm:text-2xl"
                >
                  {block.text}
                </h3>
                {matchedEmbed ? (
                  <SectionVideoPlayer
                    embed={matchedEmbed}
                    fallbackThumbnail={fallbackThumbnail}
                  />
                ) : null}
              </div>
            );
          case "ul":
            return (
              <ul
                key={key}
                className="list-disc space-y-2 pl-5 font-sans text-lg leading-relaxed text-brand-muted"
              >
                {(block.items ?? []).map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          case "image": {
            if (!block.src?.trim()) return null;
            const remote = /^https?:\/\//i.test(block.src);
            return (
              <figure
                key={key}
                className="relative my-6 aspect-[16/10] overflow-hidden bg-brand-ink/5"
              >
                {remote ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage covers
                  <img
                    src={block.src}
                    alt={block.alt || ""}
                    className="h-full w-full bg-surface-elevated object-contain"
                  />
                ) : (
                  <Image
                    src={block.src}
                    alt={block.alt || ""}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-contain bg-surface-elevated"
                  />
                )}
              </figure>
            );
          }
          default:
            return (
              <p
                key={key}
                className="font-sans text-lg leading-relaxed text-brand-muted"
              >
                {"text" in block ? block.text : null}
              </p>
            );
        }
      })}
    </div>
  );
}
