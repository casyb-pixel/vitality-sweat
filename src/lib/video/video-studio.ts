/** Multi-step Video Studio funnel states. */
export type VideoStudioPhase =
  | "SELECT_BLOG_CONTEXT"
  | "VIDEO_IDEAS_DISPLAY"
  | "ASSET_COLLECTION"
  | "SYNC_MERGE"
  | "PRODUCTION_REVIEW";

export type CreatorPublishedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string | null;
  keywords: string[];
  coverImage: string | null;
  publishedAt: string | null;
  /** Truncated markdown preview for lists. */
  bodyPreview: string;
  /** Full(er) markdown body for AI video brainstorming. */
  bodyMarkdown: string;
};

/**
 * One short-form concept from `generate_video_ideas`.
 */
export type ShortFormVideoIdea = {
  title: string;
  /** 1-sentence algorithmic hook. */
  videoHook: string;
  /** What Hunter should visually capture in the gym. */
  shootingConcept: string;
};

/**
 * Social copy package from `generate_social_package`.
 */
export type VideoSocialPackage = {
  caption: string;
  hashtags: string[];
  /** Short text overlay suggestion for the thumbnail / first frame. */
  thumbnailTitle: string;
  seoMetadata: {
    tiktok: string[];
    youtubeShorts: string[];
    instagramReels: string[];
    description: string;
  };
};

export type VideoAssetKind = "video" | "voiceover" | "merged";

export type VideoAssetReference = {
  kind: VideoAssetKind;
  path: string;
  /** Short-lived preview URL. Never persist this value in the database. */
  signedUrl: string;
  expiresAt: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type VideoProjectStatus =
  | "collecting_assets"
  | "assets_ready"
  | "merged_ready"
  | "social_package_ready"
  | "exported"
  | "archived";

export type VideoProjectState = {
  id: string;
  creatorId: string;
  postId: string | null;
  postSlug: string | null;
  blogTitle: string;
  concept: ShortFormVideoIdea;
  status: VideoProjectStatus;
  videoPath: string | null;
  voiceoverPath: string | null;
  mergedPath: string | null;
  targetSectionAnchor?: string | null;
  checklistKey?: string | null;
  thumbnailUrl?: string | null;
  publicVideoUrl?: string | null;
  embedPublished?: boolean;
  socialPackage?: VideoSocialPackage | null;
  updatedAt?: string | null;
  video?: VideoAssetReference;
  voiceover?: VideoAssetReference;
  merged?: VideoAssetReference;
};

/** Lightweight row for the resume list. */
export type VideoProjectSummary = {
  id: string;
  blogTitle: string;
  postSlug: string | null;
  conceptTitle: string;
  status: VideoProjectStatus;
  hasVideo: boolean;
  hasVoiceover: boolean;
  hasMerged: boolean;
  hasSocialPackage: boolean;
  updatedAt: string;
};

/** @deprecated Prefer VideoSocialPackage */
export type VideoProductionPack = VideoSocialPackage;
