import Image from "next/image";
import type { BlogBlock } from "@/lib/blog/posts";

/**
 * Shared Sweatlife Chronicles body renderer — used by `/blog/[slug]`
 * so archive posts and Creator Studio publishes share one CSS schema.
 */
export default function ArticleBlocks({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={key}
                className="pt-4 font-display text-[clamp(1.65rem,3vw,2.15rem)] leading-[1.15] text-brand-ink"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={key}
                className="pt-2 font-display text-xl text-brand-ink sm:text-2xl"
              >
                {block.text}
              </h3>
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
