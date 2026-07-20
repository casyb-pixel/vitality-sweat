import type { PolicyBlock, PolicyPage } from "@/lib/legal/policies";

function Block({ block }: { block: PolicyBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mt-10 font-display text-2xl font-medium tracking-tight text-brand-ink first:mt-0 sm:text-3xl">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-8 font-display text-xl font-medium tracking-tight text-brand-ink sm:text-2xl">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-base leading-relaxed text-brand-muted sm:text-lg">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    default:
      return (
        <p className="mt-4 font-sans text-base leading-relaxed text-brand-muted sm:text-lg">
          {block.text}
        </p>
      );
  }
}

export default function LegalDocument({ page }: { page: PolicyPage }) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-brand-ink/10 pb-8">
        <p className="eyebrow text-brand-orange">Legal</p>
        <h1 className="mt-3 font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] tracking-tight text-brand-ink text-balance">
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-brand-muted">
          {page.description}
        </p>
      </header>

      <div className="pt-2">
        {page.blocks.map((block, index) => (
          <Block key={`${block.type}-${index}`} block={block} />
        ))}
      </div>
    </article>
  );
}
