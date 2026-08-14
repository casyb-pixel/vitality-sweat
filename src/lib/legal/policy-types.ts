export type PolicyBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

export type PolicyPage = {
  slug: string;
  title: string;
  description: string;
  sourceUrl: string;
  blocks: PolicyBlock[];
};
