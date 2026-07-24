/** Wizard actions for the mobile creator blog-assist API. */
export type BlogAssistAction = "generate_ideas" | "finalize_post";

/**
 * One blog option returned by `generate_ideas`.
 * Phase 2 shows the title; Phase 3 uses talkingPoints as answer prompts.
 */
export type BlogIdeaOption = {
  title: string;
  /** Exactly 3 prompts Hunter answers with quick fragments in Phase 3. */
  talkingPoints: string[];
  targetAudience: string;
};

/**
 * Text-free visual parameters for a later Gemini Image API call.
 * Built by `finalize_post` alongside the polished article.
 */
export type BlogImagePrompt = {
  /** Short scene subject (8–16 words). */
  subject: string;
  /** Lighting / mood description. */
  lighting: string;
  /** Framing / composition notes (16:9 editorial). */
  composition: string;
  /** Color grade / brand look cues. */
  style: string;
  /** Things that must NEVER appear (text, logos, etc.). */
  negativeConstraints: string;
  /** Full ready-to-send prompt string for the image model. */
  prompt: string;
};

export type FinalizedPostResult = {
  title: string;
  excerpt: string;
  description: string;
  keywords: string[];
  /** Fully polished markdown body matching the archive H2/H3 fingerprint. */
  bodyMarkdown: string;
  imagePrompt: BlogImagePrompt;
  /** Auto-generated SEO fields — Hunter never fills these on his phone. */
  seoMetadata: BlogSeoMetadata;
};

/**
 * Search-optimized metadata produced by `finalize_post`.
 * Maps to Supabase `posts`: metaTitle→title, metaDescription→description,
 * slug→slug, keywords→keywords.
 */
export type BlogSeoMetadata = {
  /** Clickable SERP title, ≤60 characters. */
  metaTitle: string;
  /** CTR-focused summary, 140–160 characters. */
  metaDescription: string;
  /** URL-friendly slug, e.g. incline-bench-press-tips-chest-growth. */
  slug: string;
  /** 5–8 high-intent fitness/nutrition search terms. */
  keywords: string[];
};

/** @deprecated Prefer BlogIdeaOption — kept for transitional imports. */
export type TrendingBlogSuggestion = {
  headline: string;
  targetAudience: string;
  structuralSummary: string;
  trafficJustification: string;
  thingsToCover: string[];
  detailPrompts: string[];
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
  fingerprintSummary?: string;
  imagePrompt?: BlogImagePrompt;
};

export type BlogVisualAidResult = {
  markdown: string;
  publicUrl: string;
  path: string;
  alt: string;
  mimeType: string;
  model: string;
};
