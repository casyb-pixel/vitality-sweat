/**
 * URLs to Request indexing for in Google Search Console after deploy.
 * GSC MCP cannot submit indexing requests (Owner role + UI only).
 * Open each inspect link, then click Request indexing.
 */
export const GSC_REINDEX_QUEUE = [
  {
    url: "https://vitalitysweat.com/hello-world/",
    why: "Legacy WP ghost still self-canonical; production 308s to /",
  },
  {
    url: "https://vitalitysweat.com/contact/",
    why: "Legacy contact path; production redirects to /about",
  },
  {
    url: "https://vitalitysweat.com/checkout/",
    why: "Legacy checkout path; production redirects to /store",
  },
  {
    url: "https://vitalitysweat.com/calorie-deficit-weight-loss-golden-rule/",
    why: "Legacy root slug; production redirects to /blog/...",
  },
  {
    url: "https://vitalitysweat.com/exercises/seated-cable-row",
    why: "Top GSC impressions; recrawl after title/content upgrade",
  },
  {
    url: "https://vitalitysweat.com/exercises/chest-supported-dumbbell-row",
    why: "Top GSC impressions; recrawl after title/content upgrade",
  },
  {
    url: "https://vitalitysweat.com/exercises/dumbbell-row",
    why: "Top GSC impressions; recrawl after title/content upgrade",
  },
  {
    url: "https://vitalitysweat.com/exercises/incline-push-up",
    why: "Top GSC impressions; recrawl after title/content upgrade",
  },
  {
    url: "https://vitalitysweat.com/blog/pre-workout-carbs-dumbbell-shoulder-press-fuel",
    why: "Near page-1 CTR polish",
  },
  {
    url: "https://vitalitysweat.com/tools/bmi",
    why: "Tool SERP imprint; title upgraded",
  },
  {
    url: "https://vitalitysweat.com/tools/creatine-dose",
    why: "Tool SERP imprint; meta upgraded",
  },
] as const;

export function gscInspectUrl(pageUrl: string): string {
  const resource = encodeURIComponent("sc-domain:vitalitysweat.com");
  const target = encodeURIComponent(pageUrl);
  return `https://search.google.com/search-console/inspect?resource_id=${resource}&id=&utm_source=vitality_engine&url=${target}`;
}
