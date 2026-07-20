type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Server-only JSON-LD injector — safe for crawlers, no client hydration. */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
