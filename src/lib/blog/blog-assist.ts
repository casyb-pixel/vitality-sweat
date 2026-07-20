export type BlogAssistMode =
  | "headlines"
  | "transitions"
  | "reading_flow"
  | "full"
  | "visual"
  | "structure";

export type BlogAssistSuggestion = {
  headlines: string[];
  sectionTransitions: string[];
  readingFlowTips: string[];
  improvedExcerpt?: string;
  summary?: string;
};

export type BlogVisualAidResult = {
  markdown: string;
  publicUrl: string;
  path: string;
  alt: string;
  mimeType: string;
  model: string;
};

export type StructuredArticleResult = {
  title: string;
  excerpt: string;
  description: string;
  keywords: string[];
  bodyMarkdown: string;
  visualSubject: string;
  coverMarkdown?: string;
  coverUrl?: string;
  fingerprintSummary: string;
};
