export type LibrarySearchSignal = {
  query: string;
  searchCount: number;
  zeroResultCount: number;
  lastSearchedAt: string;
  /** True when most recent / majority of searches found no matching posts. */
  isGap: boolean;
  sampleRaw: string;
};
